import { defineConfig } from 'astro/config';
import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import { articleEnhancements } from './src/hast/article';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://alg-sit.club',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap({ filter: (url) => !url.endsWith('/404/') })],
  vite: { plugins: [tailwindcss()] },
  markdown: {
    processor: satteri({
      hastPlugins: [satteriHeadingIdsPlugin(), articleEnhancements],
    }),
    shikiConfig: {
      themes: {
        light: 'github-light-high-contrast',
        dark: 'github-dark-high-contrast',
      },
    },
  },
});
