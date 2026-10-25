import { mkdir, writeFile, readdir } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { launch } from 'chrome-launcher';
import { resolve } from 'node:path';
import { site } from '../src/data/site';

await mkdir('artifacts/lighthouse', { recursive: true });
const server = Bun.spawn(
  [
    'node',
    resolve('node_modules/astro/bin/astro.mjs'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4323',
    '--ignore-lock',
  ],
  {
    stdout: 'ignore',
    stderr: 'inherit',
  },
);
let chrome: Awaited<ReturnType<typeof launch>> | undefined;
try {
  let ready = false;
  for (let attempt = 0; attempt < 300; attempt++) {
    try {
      if ((await fetch('http://127.0.0.1:4323/')).ok) {
        ready = true;
        break;
      }
    } catch {
      /* 起動待ち */
    }
    await Bun.sleep(100);
  }
  if (!ready) throw new Error('プレビューサーバーの起動に失敗しました');
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  let passed = true;
  const preview =
    site.preview ||
    (process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main');
  if (preview)
    console.log(
      '開発プレビューのnoindex・robots制限により、SEOは測定のみ行います。',
    );
  const pages = [['home', '/']];
  for (const [name, collection] of [
    ['article', 'blog'],
    ['project', 'projects'],
  ]) {
    const entry = (await readdir(`dist/${collection}`, { withFileTypes: true }))
      .filter((file) => file.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))[0];
    pages.push([
      name,
      entry ? `/${collection}/${entry.name}/` : `/${collection}/`,
    ]);
  }
  for (const [name, path] of pages) {
    const result = await lighthouse(`http://127.0.0.1:4323${path}`, {
      port: chrome.port,
      output: 'html',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    if (!result) throw new Error('Lighthouseの結果を取得できませんでした');
    await writeFile(
      `artifacts/lighthouse/${name}.html`,
      result.report as string,
    );
    await writeFile(
      `artifacts/lighthouse/${name}.json`,
      JSON.stringify(result.lhr, null, 2),
    );
    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([key, category]) => [
        key,
        Math.round((category.score ?? 0) * 100),
      ]),
    );
    console.log(
      `${name}: ${JSON.stringify(scores)}; LCP=${result.lhr.audits['largest-contentful-paint']?.displayValue}; CLS=${result.lhr.audits['cumulative-layout-shift']?.displayValue}`,
    );
    // noindexである開発プレビューではSEOを公開品質の判定に使用しない。
    if (
      Object.entries(scores).some(
        ([key, score]) => !(preview && key === 'seo') && score < 90,
      )
    )
      passed = false;
    if (
      (result.lhr.audits['largest-contentful-paint']?.numericValue ??
        Infinity) > 2500 ||
      (result.lhr.audits['cumulative-layout-shift']?.numericValue ?? Infinity) >
        0.1
    )
      passed = false;
  }
  if (!passed) process.exitCode = 1;
} finally {
  chrome?.kill();
  server.kill();
  await server.exited;
}
