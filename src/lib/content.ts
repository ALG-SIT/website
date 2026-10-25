import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { validateSources } from './validate-source';
import { comparePosts, isPublished } from './publishing';

let validation: Promise<void> | undefined;
export async function publishedBlog() {
  await (validation ??= validateSources());
  return (
    await getCollection(
      'blog',
      ({ data }) => import.meta.env.DEV || isPublished(data),
    )
  ).sort(comparePosts);
}
export async function publishedProjects() {
  await (validation ??= validateSources());
  return (
    await getCollection(
      'projects',
      ({ data }) => import.meta.env.DEV || isPublished(data),
    )
  ).sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      a.id.localeCompare(b.id),
  );
}
export async function resolveAuthors(
  refs: CollectionEntry<'blog'>['data']['authors'],
) {
  return Promise.all(
    refs.map(async (ref) => {
      const author = await getEntry(ref);
      if (!author) throw new Error(`著者が存在しません: ${ref.id}`);
      return author;
    }),
  );
}
export function relatedPosts(
  post: CollectionEntry<'blog'>,
  posts: CollectionEntry<'blog'>[],
) {
  const score = (entry: CollectionEntry<'blog'>) =>
    entry.data.tags.filter((tag) => post.data.tags.includes(tag)).length;
  return posts
    .filter((entry) => entry.id !== post.id)
    .sort((a, b) => score(b) - score(a) || comparePosts(a, b))
    .slice(0, 3);
}
