import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load } from 'cheerio';

const directory = await mkdtemp(join(tmpdir(), 'alg-content-'));
const root = process.cwd();
const fixtures = [
  {
    name: '不正なカテゴリー',
    file: 'invalid-category.md',
    patch: 'category: invalid',
    expected: 'category',
  },
  {
    name: '未定義タグ',
    file: 'invalid-tag.md',
    patch: 'tags: [not-a-tag]',
    expected: '未定義のタグ',
  },
  {
    name: '存在しない著者',
    file: 'invalid-author.md',
    patch: 'authors: [missing-author]',
    expected: 'missing-author',
  },
  {
    name: '不正slug',
    file: 'Invalid-Slug.md',
    patch: '',
    expected: '不正または重複したslug',
  },
  {
    name: '不正な日付',
    file: 'invalid-date.md',
    patch: 'publishedAt: not-a-date',
    expected: 'publishedAt',
  },
  {
    name: '代替テキストの欠落',
    file: 'invalid-cover.md',
    patch: 'cover: ../../assets/og-source.svg',
    expected: 'coverAlt',
  },
  {
    name: '必須項目の欠落',
    file: 'invalid-title.md',
    patch: 'title: ""',
    expected: 'title',
  },
];
function content(patch: string, body = '検証用の本文です。') {
  const fields = [
    'title: 検証用記事',
    'description: スキーマ検証用の記事です。',
    'publishedAt: 2026-01-01',
    'authors: [alg]',
    'category: tech',
    'tags: [gpu]',
  ];
  if (patch) {
    const key = patch.split(':')[0];
    const index = fields.findIndex((line) => line.startsWith(`${key}:`));
    if (index >= 0) fields[index] = patch;
    else fields.push(patch);
  }
  return `---\n${fields.join('\n')}\n---\n\n${body}\n`;
}
async function build(extraEnv: Record<string, string> = {}) {
  const child = Bun.spawn([process.execPath, 'run', 'build:cloudflare'], {
    cwd: directory,
    env: {
      ...process.env,
      SITE_RELEASE: '0',
      WORKERS_CI_BRANCH: 'main',
      ASTRO_TELEMETRY_DISABLED: '1',
      ...extraEnv,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, log: out + err };
}

try {
  for (const path of [
    'src',
    'public',
    'scripts',
    'astro.config.mjs',
    'package.json',
    'tsconfig.json',
  ])
    await cp(join(root, path), join(directory, path), { recursive: true });
  await symlink(
    join(root, 'node_modules'),
    join(directory, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  // node_modulesは共有するが、検証用コンテンツのキャッシュは作業ツリーと分離する。
  const configPath = join(directory, 'astro.config.mjs');
  await writeFile(
    configPath,
    (await readFile(configPath, 'utf8')).replace(
      'defineConfig({',
      "defineConfig({\n  cacheDir: './.astro/cache',",
    ),
  );
  for (const fixture of fixtures) {
    await rm(join(directory, '.astro'), { recursive: true, force: true });
    const path = join(directory, 'src/content/blog', fixture.file);
    await writeFile(path, content(fixture.patch));
    const result = await build();
    await rm(path);
    if (result.code === 0 || !result.log.includes(fixture.expected))
      throw new Error(
        `${fixture.name}が期待通りに拒否されませんでした\n${result.log}`,
      );
    console.log(`✓ ${fixture.name}`);
  }
  await writeFile(
    join(directory, 'src/content/blog/hello-alg.md'),
    content(''),
  );
  let result = await build();
  if (result.code === 0 || !result.log.includes('不正または重複したslug'))
    throw new Error(`slug重複を検出できませんでした\n${result.log}`);
  console.log('✓ MarkdownとMDXのslug重複');
  await rm(join(directory, 'src/content/blog/hello-alg.md'));
  const codeFixtures = [
    '```python\nprint("hello")\n```',
    '```js\nconsole.log("hello");\n```',
    '```\nplain content\n```',
    '```text\nplain text\n```',
    '```ruby\nputs "hello"\n```',
    `\`\`\`ts\nconst longLine = "${'x'.repeat(250)}";\n\`\`\``,
  ].join('\n\n');
  await writeFile(
    join(directory, 'src/content/blog/markdown-fixture.md'),
    content('', codeFixtures)
      .replace('title: 検証用記事', 'title: Markdownコード検証')
      .replace(
        'description: スキーマ検証用の記事です。',
        'description: Markdownコード欄を検証します。',
      ),
  );
  await writeFile(
    join(directory, 'src/content/blog/mdx-fixture.mdx'),
    content(
      '',
      `import Callout from '../../components/Callout.astro';

## MDX検証

<Callout title="ALG_MDX_RENDERED_9481"><p>コンポーネントの検証。</p></Callout>

${codeFixtures}`,
    ),
  );
  await writeFile(
    join(directory, 'src/content/blog/private-fixture.md'),
    content('draft: true', 'ALG_PRIVATE_BLOG_MARKER_9481'),
  );
  await writeFile(
    join(directory, 'src/content/blog/future-fixture.md'),
    content('publishedAt: 2999-01-01', 'ALG_PRIVATE_FUTURE_MARKER_9481'),
  );
  await writeFile(
    join(directory, 'src/content/projects/private-project.md'),
    '---\ntitle: 非公開プロジェクト\ndescription: 非公開検証\nstatus: planning\ndraft: true\n---\nALG_PRIVATE_PROJECT_MARKER_9481\n',
  );
  await rm(join(directory, '.astro'), { recursive: true, force: true });
  result = await build();
  if (result.code !== 0) throw new Error(result.log);
  console.log(
    '✓ 下書き記事・下書きプロジェクト・将来記事が全配信成果物から除外される',
  );
  if (
    !(
      await readFile(
        join(directory, 'dist/blog/mdx-fixture/index.html'),
        'utf8',
      )
    ).includes('ALG_MDX_RENDERED_9481')
  )
    throw new Error('MDXコンポーネントがレンダリングされませんでした');
  console.log('✓ MDXからAstroコンポーネントを生成');
  for (const slug of ['markdown-fixture', 'mdx-fixture']) {
    const $ = load(
      await readFile(join(directory, `dist/blog/${slug}/index.html`), 'utf8'),
    );
    const labels = $('.code-header .code-language')
      .map((_, el) => $(el).text())
      .get();
    if (
      JSON.stringify(labels) !==
      JSON.stringify([
        'Python',
        'JavaScript',
        'Text',
        'Text',
        'ruby',
        'TypeScript',
      ])
    )
      throw new Error(`${slug}: コード言語名が不正です: ${labels}`);
    if (
      $('.code-wrapper > pre > code').length !== 6 ||
      $('.code-wrapper > .code-header:first-child').length !== 6 ||
      !$('.code-wrapper pre').last().text().includes('x'.repeat(250))
    )
      throw new Error(`${slug}: コード本文またはヘッダーが失われました`);
  }
  console.log('✓ Markdown・MDXの言語名・別名・指定なし・長いコードを静的生成');

  // 現在の本番設定に依存せず、プレビューの公開拒否を検証する。
  const sitePath = join(directory, 'src/data/site.ts');
  const siteSource = await readFile(sitePath, 'utf8');
  await writeFile(
    sitePath,
    siteSource.replace('preview: false', 'preview: true'),
  );
  const release = Bun.spawn([process.execPath, 'scripts/verify-output.ts'], {
    cwd: directory,
    env: { ...process.env, SITE_RELEASE: '1', WORKERS_CI_BRANCH: 'main' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [releaseOut, releaseErr, releaseCode] = await Promise.all([
    new Response(release.stdout).text(),
    new Response(release.stderr).text(),
    release.exited,
  ]);
  if (releaseCode === 0 || !(releaseOut + releaseErr).includes('正式公開'))
    throw new Error('開発プレビューの正式公開を拒否できませんでした');
  console.log('✓ プレビュー設定では正式公開の検証に失敗する');
  await writeFile(sitePath, siteSource);

  for (const collection of ['blog', 'projects']) {
    for (const filename of await readdir(
      join(directory, `src/content/${collection}`),
    )) {
      if (/\.mdx?$/.test(filename))
        await rm(join(directory, `src/content/${collection}`, filename));
    }
  }
  await rm(join(directory, '.astro'), { recursive: true, force: true });
  const emptyBuild = Bun.spawn([process.execPath, 'run', 'build:cloudflare'], {
    cwd: directory,
    env: {
      ...process.env,
      SITE_RELEASE: '0',
      WORKERS_CI_BRANCH: 'main',
      ASTRO_TELEMETRY_DISABLED: '1',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [emptyOut, emptyErr, emptyCode] = await Promise.all([
    new Response(emptyBuild.stdout).text(),
    new Response(emptyBuild.stderr).text(),
    emptyBuild.exited,
  ]);
  if (emptyCode !== 0)
    throw new Error(
      `空のコンテンツでビルドに失敗しました\n${emptyOut}${emptyErr}`,
    );
  const manifest = JSON.parse(
    await readFile(
      join(directory, 'dist/pagefind/pagefind-entry.json'),
      'utf8',
    ),
  );
  if (
    Object.values(
      manifest.languages as Record<string, { page_count: number }>,
    ).some((language) => language.page_count > 0)
  )
    throw new Error('コンテンツがない場合に固定ページが検索対象になっています');
  console.log(
    '✓ 記事・プロジェクトが0件でもビルドでき、固定ページは検索対象にならない',
  );
  // 検索公開の検証は一時コピーだけで行う。
  await writeFile(
    sitePath,
    siteSource
      .replace('preview: true', 'preview: false')
      .replace(/github: '[^']*'/, "github: ''")
      .replace(
        'social: [] as',
        "social: [{ label: '検証用SNS', url: 'https://example.com/alg' }] as",
      ),
  );
  await writeFile(
    join(directory, 'src/content/blog/seo-cover.md'),
    content('cover: ../../assets/og-source.svg\ncoverAlt: 記事カバーの検証'),
  );
  await writeFile(
    join(directory, 'src/content/blog/seo-no-cover.md'),
    content('title: カバーなしの記事').replace(
      'description: スキーマ検証用の記事です。',
      'description: カバーなし記事の共有画像を検証します。',
    ),
  );
  await cp(
    join(root, 'public/og.png'),
    join(directory, 'src/assets/seo-cover.png'),
  );
  await writeFile(
    join(directory, 'src/content/projects/seo-cover.md'),
    `---
 title: 共有画像の検証プロジェクト
 description: PNGの共有画像を検証します。
 status: active
 cover: ../../assets/seo-cover.png
 coverAlt: プロジェクトカバーの検証
 ---
 検証用プロジェクトです。
 `
      .split('\n')
      .map((line) => line.trimStart())
      .join('\n'),
  );
  result = await build({ SITE_RELEASE: '1', WORKERS_CI_BRANCH: 'main' });
  if (result.code !== 0)
    throw new Error(`正式公開相当のSEO検証に失敗しました\n${result.log}`);
  console.log(
    '✓ 正式公開相当で検索許可・SNSのみのsameAs・SVG/PNGカバー・カバーなし記事を検証',
  );
  result = await build({ SITE_RELEASE: '1', WORKERS_CI_BRANCH: 'feature/seo' });
  if (result.code !== 0)
    throw new Error(`ブランチプレビューのSEO検証に失敗しました\n${result.log}`);
  console.log('✓ 正式コンテンツでもmain以外のプレビューは検索拒否になる');
} finally {
  await rm(directory, { recursive: true, force: true });
}
