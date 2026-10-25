import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { load } from 'cheerio';
import { parse } from 'yaml';
import { isPublished } from '../src/lib/publishing';
import { site } from '../src/data/site';

const root = resolve('dist');
const failures: string[] = [];
const assert = (condition: unknown, message: string) => {
  if (!condition) failures.push(message);
};
async function filesIn(dir: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((entry) =>
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
  'fonts/alg-jp-400.woff2',
  'fonts/alg-jp-700.woff2',
  '_headers',
  '_redirects',
];
for (const path of expected)
  assert(files.includes(join(root, path)), `必要な成果物がありません: ${path}`);
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
  assert(canonical?.startsWith(`${site.url}/`), `Canonicalが不正: ${name}`);
  assert(
    $('meta[property="og:image"]').attr('content')?.startsWith(site.url),
    `OGP画像がありません: ${name}`,
  );
  assert($('meta[name="twitter:card"]').length, `Xカードがありません: ${name}`);
  for (const image of $('img').toArray())
    assert($(image).attr('alt') !== undefined, `altがありません: ${name}`);
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      JSON.parse($(script).text());
    } catch {
      failures.push(`構造化データが不正: ${name}`);
    }
  }
  for (const element of $(
    'a[href], img[src], script[src], link[rel="stylesheet"][href]',
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
        cache.get(target)!(
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
    `Cloudflare Pagesのファイルサイズ上限を超過: ${file}`,
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
