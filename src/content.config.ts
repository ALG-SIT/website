import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';
import { tags } from './data/tags';

const nonempty = z.string().trim().min(1);
const httpUrl = z
  .url()
  .refine(
    (value) => /^https?:\/\//.test(value),
    'HTTP(S) URLを指定してください',
  );
const blog = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z
      .object({
        title: nonempty,
        description: nonempty,
        publishedAt: z.coerce.date(),
        updatedAt: z.coerce.date().optional(),
        authors: z.array(reference('authors')).min(1),
        category: z.enum(['tech', 'activity', 'news']),
        tags: z
          .array(
            z
              .string()
              .refine((id) => Object.hasOwn(tags, id), '未定義のタグです'),
          )
          .default([]),
        cover: image().optional(),
        coverAlt: nonempty.optional(),
        draft: z.boolean().default(false),
        featured: z.boolean().default(false),
      })
      .refine((data) => !data.cover || !!data.coverAlt, {
        message: 'coverにはcoverAltが必要です',
        path: ['coverAlt'],
      })
      .refine((data) => !data.updatedAt || data.updatedAt >= data.publishedAt, {
        message: '更新日は公開日以降にしてください',
        path: ['updatedAt'],
      }),
});
const projects = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z
      .object({
        title: nonempty,
        description: nonempty,
        status: z.enum(['planning', 'active', 'completed', 'archived']),
        technologies: z.array(nonempty).default([]),
        authors: z.array(reference('authors')).default([]),
        cover: image().optional(),
        coverAlt: nonempty.optional(),
        repositoryUrl: httpUrl.optional(),
        websiteUrl: httpUrl.optional(),
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
      })
      .refine((data) => !data.cover || !!data.coverAlt, {
        message: 'coverにはcoverAltが必要です',
        path: ['coverAlt'],
      }),
});
const authors = defineCollection({
  loader: file('src/data/authors.json'),
  schema: ({ image }) =>
    z.object({
      displayName: nonempty,
      bio: nonempty.optional(),
      github: httpUrl.optional(),
      website: httpUrl.optional(),
      avatar: image().optional(),
    }),
});
export const collections = { blog, projects, authors };
