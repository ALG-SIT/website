import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { site } from './src/data/site';
import { articleEnhancements } from './src/hast/article';

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  // カバーはリポジトリ内のレビュー済み素材のみ。共有用PNGへの変換を許可する。
  image: { dangerouslyProcessSVG: true },
  integrations: [
    mdx(),
    sitemap({
      filter: (url) => !/^\/404(?:\/|\.html)?$/.test(new URL(url).pathname),
    }),
  ],
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
