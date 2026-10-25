import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

function pages(collection: 'blog' | 'projects') {
  const root = `dist/${collection}`;
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(join(root, entry.name, 'index.html')),
    )
    .map((entry) => {
      const $ = load(
        readFileSync(join(root, entry.name, 'index.html'), 'utf8'),
      );
      return {
        path: `/${collection}/${entry.name}/`,
        title: $('h1').text(),
        hasCode: $('.prose pre').length > 0,
        heading: $('.toc a').first().text(),
      };
    });
}
export const postPages = pages('blog');
export const projectPages = pages('projects');
export const searchablePages = [...postPages, ...projectPages];
