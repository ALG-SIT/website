import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { load } from 'cheerio';

async function filesIn(directory: string): Promise<string[]> {
  return (
    await Promise.all(
      (
        await readdir(directory, { withFileTypes: true })
      ).map((entry) =>
        entry.isDirectory()
          ? filesIn(join(directory, entry.name))
          : [join(directory, entry.name)],
      ),
    )
  ).flat();
}
let count = 0;
for (const file of (await filesIn('dist')).filter((path) =>
  path.endsWith('.html'),
)) {
  if (load(await readFile(file, 'utf8'))('[data-pagefind-body]').length)
    count++;
}
await rm('dist/pagefind', { recursive: true, force: true });
if (count === 0) {
  await mkdir('dist/pagefind', { recursive: true });
  await writeFile(
    'dist/pagefind/pagefind.js',
    'export async function search() { return { results: [] }; }\n',
  );
  await writeFile(
    'dist/pagefind/pagefind-entry.json',
    JSON.stringify({ empty: true, languages: {} }),
  );
  console.log('検索対象は0件です。空の検索モジュールを生成しました。');
} else {
  const child = Bun.spawn(
    [
      'node',
      resolve('node_modules/pagefind/lib/runner/bin.cjs'),
      '--site',
      'dist',
      '--root-selector',
      '[data-pagefind-body]',
      '--force-language',
      'ja',
    ],
    { stdout: 'inherit', stderr: 'inherit' },
  );
  const code = await child.exited;
  if (code !== 0) throw new Error(`Pagefindが終了コード${code}で失敗しました`);
}
