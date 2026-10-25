import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'yaml';
import { slugPattern } from './publishing';

/** Astroが無効な参照のエントリーを読み飛ばす前に、元データで参照整合性を検査する。 */
export async function validateSources() {
  const authors = JSON.parse(
    await readFile('src/data/authors.json', 'utf8'),
  ) as { id: string }[];
  const ids = new Set<string>();
  for (const author of authors) {
    if (!author.id || ids.has(author.id))
      throw new Error(`不正または重複した著者ID: ${author.id}`);
    ids.add(author.id);
  }
  if (!ids.has('alg')) throw new Error('共通著者algが必要です');
  for (const collection of ['blog', 'projects']) {
    const filenames = await readdir(`src/content/${collection}`);
    const slugs = new Set<string>();
    for (const filename of filenames.filter((file) => /\.mdx?$/.test(file))) {
      const slug = filename.replace(/\.mdx?$/, '');
      if (!slugPattern.test(slug) || slugs.has(slug))
        throw new Error(`不正または重複したslug: ${collection}/${filename}`);
      slugs.add(slug);
      const raw = await readFile(
        `src/content/${collection}/${filename}`,
        'utf8',
      );
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match)
        throw new Error(`Frontmatterがありません: ${collection}/${filename}`);
      const data = parse(match[1]) as { authors?: unknown } | null;
      if (data && Array.isArray(data.authors)) {
        for (const author of data.authors)
          if (typeof author !== 'string' || !ids.has(author))
            throw new Error(
              `著者が存在しません: ${String(author)} (${collection}/${filename})`,
            );
      }
    }
  }
}
