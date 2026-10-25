import {
  cp,
  mkdtemp,
  rm,
  symlink,
  writeFile,
  readFile,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
async function build() {
  const child = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: directory,
    env: { ...process.env, SITE_RELEASE: '0', ASTRO_TELEMETRY_DISABLED: '1' },
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
  await writeFile(
    join(directory, 'src/content/blog/mdx-fixture.mdx'),
    content(
      '',
      `import Callout from '../../components/Callout.astro';

## MDX検証

<Callout title="ALG_MDX_RENDERED_9481"><p>コンポーネントの検証。</p></Callout>`,
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
  const release = Bun.spawn([process.execPath, 'scripts/verify-output.ts'], {
    cwd: directory,
    env: { ...process.env, SITE_RELEASE: '1' },
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
  console.log('✓ サンプル状態では正式公開の検証に失敗する');

  for (const collection of ['blog', 'projects']) {
    for (const filename of await readdir(
      join(directory, `src/content/${collection}`),
    )) {
      if (/\.mdx?$/.test(filename))
        await rm(join(directory, `src/content/${collection}`, filename));
    }
  }
  await rm(join(directory, '.astro'), { recursive: true, force: true });
  const emptyBuild = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: directory,
    env: { ...process.env, SITE_RELEASE: '0', ASTRO_TELEMETRY_DISABLED: '1' },
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
} finally {
  await rm(directory, { recursive: true, force: true });
}
