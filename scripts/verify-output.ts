import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { load } from 'cheerio';
import sharp from 'sharp';
import { parse } from 'yaml';
import { site } from '../src/data/site';
import { isPublished } from '../src/lib/publishing';
import { isPreview, organizationId } from '../src/lib/seo';

interface StructuredNode {
  '@type': string;
  '@id'?: string;
  name?: string;
  url?: string;
  alternateName?: string;
  sameAs?: string[];
  itemListElement?: {
    '@type': string;
    position: number;
    name: string;
    item: string;
  }[];
  headline?: string;
  description?: string;
  mainEntityOfPage?: string;
  publisher?: { '@id': string };
  author?: unknown[];
  datePublished?: string;
  dateModified?: string;
  image?: string;
}

const root = resolve('dist');
const failures: string[] = [];
const assert = (condition: unknown, message: string) => {
  if (!condition) failures.push(message);
};
async function filesIn(dir: string): Promise<string[]> {
  return (
    await Promise.all(
      (
        await readdir(dir, { withFileTypes: true })
      ).map((entry) =>
        entry.isDirectory()
          ? filesIn(join(dir, entry.name))
          : [join(dir, entry.name)],
      ),
    )
  ).flat();
}
const files = await filesIn(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const titles = new Set<string>();
const descriptions = new Set<string>();
const expected = [
  'index.html',
  'about/index.html',
  'blog/index.html',
  'projects/index.html',
  'join/index.html',
  'contact/index.html',
  'privacy/index.html',
  '404.html',
  'rss.xml',
  'robots.txt',
  'sitemap-index.xml',
  'pagefind/pagefind.js',
  'og.png',
  'favicon.svg',
  'favicon-96x96.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'brand-wordmark-light.png',
  'brand-wordmark-dark.png',
  'brand-square.svg',
  'fonts/alg-jp-400.woff2',
  'fonts/alg-jp-700.woff2',
  '_headers',
  '_redirects',
];
for (const path of expected)
  assert(files.includes(join(root, path)), `必要な成果物がありません: ${path}`);
const preview = isPreview(site.preview, process.env.WORKERS_CI_BRANCH);
const robots = await readFile(join(root, 'robots.txt'), 'utf8');
assert(
  robots.includes(preview ? 'Disallow: /' : 'Allow: /') &&
    (preview || !robots.includes('Disallow: /')),
  'robots.txtの検索公開設定が不正です',
);
assert(
  robots.includes(`Sitemap: ${site.url}/sitemap-index.xml`),
  'robotsのサイトマップURLが不正です',
);
const imageCache = new Map<
  string,
  Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
>();
async function imageMetadata(path: string) {
  const cached = imageCache.get(path);
  if (cached) return cached;
  const metadata = await sharp(path).metadata();
  imageCache.set(path, metadata);
  return metadata;
}
for (const [filename, size] of [
  ['favicon-96x96.png', 96],
  ['apple-touch-icon.png', 180],
] as const) {
  const metadata = await imageMetadata(join(root, filename));
  assert(
    metadata.format === 'png' &&
      metadata.width === size &&
      metadata.height === size,
    `アイコンのサイズが不正: ${filename}`,
  );
  assert(
    metadata.hasAlpha === (size === 96),
    `アイコンの背景が不正: ${filename}`,
  );
}
const ico = await readFile(join(root, 'favicon.ico'));
assert(
  ico.readUInt16LE(0) === 0 &&
    ico.readUInt16LE(2) === 1 &&
    ico.readUInt16LE(4) === 3,
  'ICOヘッダーが不正です',
);
for (const [index, size] of [16, 32, 48].entries()) {
  const entry = 6 + index * 16;
  const length = ico.readUInt32LE(entry + 8);
  const offset = ico.readUInt32LE(entry + 12);
  const metadata = await sharp(
    ico.subarray(offset, offset + length),
  ).metadata();
  assert(
    ico[entry] === size &&
      ico[entry + 1] === size &&
      metadata.width === size &&
      metadata.height === size &&
      metadata.hasAlpha,
    `ICO画像が不正: ${size}px`,
  );
}
const cache = new Map<string, ReturnType<typeof load>>();
for (const path of htmlFiles)
  cache.set(path, load(await readFile(path, 'utf8')));
for (const [path, $] of cache) {
  const name = path.slice(root.length);
  const title = $('title').text();
  const description = $('meta[name="description"]').attr('content');
  assert(title && !titles.has(title), `titleが空または重複: ${name}`);
  titles.add(title);
  assert(
    description && !descriptions.has(description),
    `descriptionが空または重複: ${name}`,
  );
  descriptions.add(description ?? '');
  assert($('html').attr('lang') === 'ja', `langがjaではありません: ${name}`);
  assert($('h1').length === 1, `h1はページに1個必要です: ${name}`);
  const canonical = $('link[rel="canonical"]').attr('href');
  const pagePath =
    name === '/index.html'
      ? '/'
      : name === '/404.html'
        ? '/404.html'
        : name.replace(/index\.html$/, '');
  assert(
    $('link[rel="canonical"]').length === 1 &&
      canonical === new URL(pagePath, site.url).href,
    `Canonicalが不正: ${name}`,
  );
  assert(
    $('meta[property="og:url"]').attr('content') === canonical,
    `og:urlがCanonicalと異なります: ${name}`,
  );
  assert(
    $('meta[name="robots"]').length ===
      Number(preview || pagePath === '/404.html'),
    `noindexの出力が不正: ${name}`,
  );
  if (preview || pagePath === '/404.html')
    assert(
      $('meta[name="robots"]').attr('content') === 'noindex, nofollow',
      `検索拒否設定が不正: ${name}`,
    );
  for (const [href, type, sizes, rel] of [
    ['/favicon.svg', 'image/svg+xml', 'any', 'icon'],
    ['/favicon-96x96.png', 'image/png', '96x96', 'icon'],
    ['/favicon.ico', 'image/x-icon', '16x16 32x32 48x48', 'icon'],
    ['/apple-touch-icon.png', undefined, '180x180', 'apple-touch-icon'],
  ]) {
    const icon = $(`link[rel="${rel}"][href="${href}"]`);
    assert(
      icon.length === 1 &&
        icon.attr('sizes') === sizes &&
        (!type || icon.attr('type') === type),
      `アイコン参照が不正: ${name} → ${href}`,
    );
  }
  assert(
    $('meta[property="og:image"]').attr('content')?.startsWith(site.url),
    `OGP画像がありません: ${name}`,
  );
  assert($('meta[name="twitter:card"]').length, `Xカードがありません: ${name}`);
  const socialUrl = $('meta[property="og:image"]').attr('content');
  const alt = $('meta[property="og:image:alt"]').attr('content');
  assert(
    alt && $('meta[name="twitter:image:alt"]').attr('content') === alt,
    `共有画像の代替テキストが不正: ${name}`,
  );
  assert(
    $('meta[name="twitter:image"]').attr('content') === socialUrl,
    `共有画像が一致しません: ${name}`,
  );
  if (socialUrl) {
    const url = new URL(socialUrl);
    const imagePath = join(root, decodeURIComponent(url.pathname));
    assert(
      url.origin === site.url && files.includes(imagePath),
      `共有画像が存在しません: ${name}`,
    );
    if (files.includes(imagePath)) {
      const metadata = await imageMetadata(imagePath);
      assert(
        $('meta[property="og:image:width"]').attr('content') ===
          String(metadata.width) &&
          $('meta[property="og:image:height"]').attr('content') ===
            String(metadata.height) &&
          $('meta[property="og:image:type"]').attr('content') ===
            `image/${metadata.format}`,
        `共有画像の属性が不正: ${name}`,
      );
    }
  }
  for (const image of $('img').toArray())
    assert($(image).attr('alt') !== undefined, `altがありません: ${name}`);
  const nodes: StructuredNode[] = [];
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const parsed = JSON.parse($(script).text());
      nodes.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      failures.push(`構造化データが不正: ${name}`);
    }
  }
  const org = nodes.find((node) => node['@type'] === 'Organization');
  assert(
    org?.['@id'] === organizationId &&
      org?.name === site.name &&
      org?.url === `${site.url}/`,
    `Organizationが不正: ${name}`,
  );
  const expectedSameAs = [
    ...new Set(
      [site.github, ...site.social.map((item) => item.url)]
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];
  assert(
    JSON.stringify(org?.sameAs ?? []) === JSON.stringify(expectedSameAs),
    `sameAsが不正: ${name}`,
  );
  const website = nodes.filter((node) => node['@type'] === 'WebSite');
  assert(
    website.length === Number(pagePath === '/'),
    `WebSiteの出力先が不正: ${name}`,
  );
  if (pagePath === '/')
    assert(
      website[0]?.name === site.name &&
        website[0]?.alternateName === site.shortName &&
        website[0]?.url === canonical,
      'WebSiteのサイト名またはURLが不正です',
    );
  const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList');
  const isDetail = /^\/(blog|projects)\/[^/]+\/$/.test(pagePath);
  assert(
    !!breadcrumb === isDetail,
    `パンくず構造化データの出力先が不正: ${name}`,
  );
  if (breadcrumb) {
    const visible = $(
      '.breadcrumbs a, .breadcrumbs [aria-current="page"]',
    ).toArray();
    const items = breadcrumb.itemListElement;
    assert(
      Array.isArray(items) &&
        items.length === 3 &&
        items.length === visible.length,
      `パンくずの件数が不正: ${name}`,
    );
    for (const [index, item] of (items ?? []).entries()) {
      const element = $(visible[index]);
      assert(
        item['@type'] === 'ListItem' &&
          item.position === index + 1 &&
          item.name === element.text().trim() &&
          item.item ===
            new URL(element.attr('href') ?? pagePath, site.url).href,
        `パンくずと表示が一致しません: ${name}`,
      );
    }
    assert(
      items?.at(-1)?.name === $('h1').text().trim(),
      `パンくずの末尾が現在のページではありません: ${name}`,
    );
  }
  const article = nodes.find((node) => node['@type'] === 'Article');
  assert(
    !!article === (isDetail && pagePath.startsWith('/blog/')),
    `Articleの出力先が不正: ${name}`,
  );
  assert(
    $('meta[property="og:type"]').attr('content') ===
      (article ? 'article' : 'website'),
    `og:typeが不正: ${name}`,
  );
  if (article) {
    assert(
      article.headline === $('h1').text().trim() &&
        article.description === description &&
        article.mainEntityOfPage === canonical,
      `Articleの内容が不正: ${name}`,
    );
    assert(
      article.publisher?.['@id'] === organizationId &&
        Array.isArray(article.author) &&
        article.author.length > 0,
      `Articleの発行元または著者が不正: ${name}`,
    );
    assert(
      article.datePublished === $('time').first().attr('datetime') &&
        article.datePublished ===
          $('meta[property="article:published_time"]').attr('content'),
      `記事の公開日が不一致: ${name}`,
    );
    assert(
      article.dateModified ===
        $('meta[property="article:modified_time"]').attr('content') &&
        (!article.dateModified ||
          article.dateModified === $('time').eq(1).attr('datetime')),
      `記事の更新日が不一致: ${name}`,
    );
    assert(
      $('.article-cover').length
        ? article.image === socialUrl
        : article.image === undefined,
      `記事画像が不正: ${name}`,
    );
  }
  for (const element of $(
    'a[href], img[src], script[src], link[href]',
  ).toArray()) {
    const href = $(element).attr('href') ?? $(element).attr('src');
    if (!href || /^(mailto:|tel:|data:)/.test(href)) continue;
    const url = new URL(href, canonical ?? site.url);
    if (url.origin !== site.url) continue;
    const decoded = decodeURIComponent(url.pathname);
    const target = join(
      root,
      decoded.endsWith('/') ? `${decoded}index.html` : decoded,
    );
    assert(files.includes(target), `リンク先がありません: ${name} → ${href}`);
    if (url.hash && target.endsWith('.html') && cache.has(target))
      assert(
        cache.get(target)?.(
          `[id="${decodeURIComponent(url.hash.slice(1)).replaceAll('"', '\\"')}"]`,
        ).length,
        `アンカーがありません: ${name} → ${href}`,
      );
  }
}
const searchManifest = JSON.parse(
  await readFile(join(root, 'pagefind/pagefind-entry.json'), 'utf8'),
) as { languages: Record<string, { page_count: number }> };
const expectedSearchCount = [...cache.values()].filter(
  ($) => $('[data-pagefind-body]').length,
).length;
const actualSearchCount = Object.values(searchManifest.languages).reduce(
  (count, language) => count + language.page_count,
  0,
);
assert(
  actualSearchCount === expectedSearchCount,
  `検索対象ページ数が不正: ${actualSearchCount} / ${expectedSearchCount}`,
);
const textOutputs = (
  await Promise.all(
    files
      .filter((file) => /\.(html|js|json|xml|txt|css)$/.test(file))
      .map((file) => readFile(file, 'utf8')),
  )
).join('\n');
const rss = load(await readFile(join(root, 'rss.xml'), 'utf8'), { xml: true });
const sitemapText = (
  await Promise.all(
    files
      .filter((file) => /sitemap.*\.xml$/.test(file))
      .map((file) => readFile(file, 'utf8')),
  )
).join('');
for (const collection of ['blog', 'projects']) {
  for (const filename of (await readdir(`src/content/${collection}`)).filter(
    (file) => /\.mdx?$/.test(file),
  )) {
    const raw = await readFile(`src/content/${collection}/${filename}`, 'utf8');
    const fm = parse(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '');
    const published = isPublished({
      draft: fm.draft ?? false,
      publishedAt: fm.publishedAt ? new Date(fm.publishedAt) : undefined,
    });
    const slug = filename.replace(/\.mdx?$/, '');
    const path = `/${collection}/${slug}/`;
    if (published) {
      assert(
        files.includes(join(root, path, 'index.html')),
        `公開ページがありません: ${path}`,
      );
      assert(
        sitemapText.includes(new URL(path, site.url).href),
        `サイトマップにありません: ${path}`,
      );
      if (collection === 'blog')
        assert(
          rss('item link')
            .toArray()
            .some((el) => rss(el).text() === new URL(path, site.url).href),
          `RSSにありません: ${path}`,
        );
    } else {
      assert(
        !files.includes(join(root, path, 'index.html')),
        `非公開ページが生成されました: ${path}`,
      );
      assert(
        !sitemapText.includes(path),
        `非公開URLがサイトマップにあります: ${path}`,
      );
      assert(
        !textOutputs.includes(path),
        `非公開URLが成果物にあります: ${path}`,
      );
      // テスト用の固有文字列は検索のバイナリ片も含め、すべての配信ファイルを検査する。
      const marker = raw.match(/ALG_PRIVATE_[A-Z0-9_]+/)?.[0];
      if (marker)
        for (const file of files)
          assert(
            !(await readFile(file)).includes(Buffer.from(marker)),
            `非公開本文が漏れています: ${file}`,
          );
    }
  }
}
for (const file of files)
  assert(
    (await stat(file)).size < 25 * 1024 * 1024,
    `Cloudflare Workers Static Assetsのファイルサイズ上限を超過: ${file}`,
  );
assert(!sitemapText.includes('/404'), '404がサイトマップに含まれています');
if (process.env.SITE_RELEASE === '1') {
  assert(
    !site.preview,
    '正式公開にはsrc/data/site.tsのpreviewをfalseにしてください',
  );
  assert(
    site.contactEmail || site.social.length || site.github,
    '正式公開には確認済みの連絡先が必要です',
  );
  assert(
    !textOutputs.includes('サイト開発用のサンプル') &&
      !textOutputs.includes('開発中のサイト紹介サンプル'),
    '正式公開前にサンプルコンテンツを差し替えてください',
  );
  assert(
    !(await readFile(join(root, 'robots.txt'), 'utf8')).includes('Disallow: /'),
    '正式公開のrobots.txtが全拒否になっています',
  );
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `生成物検証成功: ${htmlFiles.length}ページ、内部リンク・SEO・公開範囲・配信サイズ`,
);
