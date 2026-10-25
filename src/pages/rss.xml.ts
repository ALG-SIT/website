import rss from '@astrojs/rss';
import { publishedBlog } from '../lib/content';
import { site } from '../data/site';
export async function GET() {
  const posts = await publishedBlog();
  return rss({
    title: `${site.name}の記事`,
    description: site.description,
    site: site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: `/blog/${post.id}/`,
      ...(post.data.updatedAt
        ? {
            customData: `<atom:updated>${post.data.updatedAt.toISOString()}</atom:updated>`,
          }
        : {}),
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: '<language>ja</language>',
  });
}
