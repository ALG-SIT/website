import { satteri, satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { site } from './src/data/site';
import { articleEnhancements } from './src/hast/article';

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'auto' },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'ALG Sans',
      cssVariable: '--font-alg',
      display: 'swap',
      options: {
        variants: [
          {
            src: ['./.font-trial/alg-jp-400.woff2'],
            weight: 400,
            style: 'normal',
          },
          {
            src: ['./.font-trial/alg-jp-700.woff2'],
            weight: 700,
            style: 'normal',
          },
        ],
      },
    },
  ],
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
