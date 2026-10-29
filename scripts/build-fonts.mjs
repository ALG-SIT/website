import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { load } from 'cheerio';
import subsetFont from 'subset-font';

const built = process.argv.includes('--built');
async function filesIn(directory) {
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
const sources = (await filesIn(built ? 'dist' : 'src')).filter((file) =>
  built ? file.endsWith('.html') : /\.(astro|mdx?|ts|json)$/.test(file),
);
let text = '';
for (const file of sources) {
  const source = await readFile(file, 'utf8');
  if (built) {
    const $ = load(source);
    $('script,style').remove();
    text += $('body').text();
  } else text += source;
}
// 遅延表示する検索・エラー表示などのUI文字列も含める。非公開記事本文は読み込まない。
if (built) text += await readFile('src/lib/browser.ts', 'utf8');
const characters = [...new Set([...text])].sort().join('');
const destination = '.font-trial';
await mkdir(destination, { recursive: true });
for (const weight of [400, 700]) {
  const font = await readFile(
    resolve(
      `node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-${weight}-normal.woff2`,
    ),
  );
  const subset = await subsetFont(font, characters, { targetFormat: 'woff2' });
  const name = `alg-jp-${weight}`;
  const filename = `${name}.woff2`;
  await writeFile(join(destination, filename), subset);
  console.log(
    `日本語フォント${weight}: ${Math.round(subset.length / 1024)} KiB (${characters.length}文字)`,
  );
}
