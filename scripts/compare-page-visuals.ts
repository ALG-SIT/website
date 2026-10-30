import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const baselineRoot = resolve(process.argv[2] ?? '/tmp/alg-lcp-before/dist');
const currentRoot = resolve(process.argv[3] ?? 'dist');
const widths = [320, 375, 768, 1023, 1440];
const themes = ['light', 'dark'] as const;
const threshold = 45;
const baselinePort = 4341;
const currentPort = 4342;
const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

async function routesIn(root: string, directory = root): Promise<string[]> {
  const routes: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) routes.push(...(await routesIn(root, path)));
    else if (entry.name === 'index.html') {
      const parent = relative(root, directory);
      routes.push(parent ? `/${parent.split(/[\\/]/).join('/')}/` : '/');
    } else if (entry.name === '404.html' && directory === root) {
      routes.push('/404.html');
    }
  }
  return routes;
}

function serve(root: string, port: number) {
  return Bun.serve({
    port,
    async fetch(request) {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      let file = resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(`${root}/`))
        return new Response('Not found', { status: 404 });
      try {
        if ((await stat(file)).isDirectory())
          file = resolve(file, 'index.html');
        return new Response(await readFile(file), {
          headers: {
            'content-type':
              contentTypes[extname(file)] ?? 'application/octet-stream',
            'cache-control': 'no-store',
          },
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    },
  });
}

const [baselineRoutes, currentRoutes] = await Promise.all([
  routesIn(baselineRoot),
  routesIn(currentRoot),
]);
if (
  JSON.stringify([...baselineRoutes].sort()) !==
  JSON.stringify([...currentRoutes].sort())
)
  throw new Error(
    `ルート不一致\nbaseline: ${baselineRoutes.sort().join(', ')}\ncurrent: ${currentRoutes.sort().join(', ')}`,
  );

const baselineServer = serve(baselineRoot, baselinePort);
const currentServer = serve(currentRoot, currentPort);
const browser = await chromium.launch({ headless: true });
const results: Array<{
  route: string;
  width: number;
  theme: (typeof themes)[number];
  baselineHeight: number;
  currentHeight: number;
  heightDelta: number;
  changedPercent: number;
  horizontalOverflow: boolean;
}> = [];
const mismatches: Array<{
  route: string;
  width: number;
  theme: (typeof themes)[number];
  baseline: Buffer;
  current: Buffer;
}> = [];

try {
  await mkdir('artifacts/page-display-audit', { recursive: true });
  for (const width of widths) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: theme,
      });
      await context.addInitScript((preference) => {
        localStorage.setItem('alg-theme', preference);
      }, theme);
      for (const route of [...baselineRoutes].sort()) {
        const captures: Buffer[] = [];
        let baselineHeight = 0;
        let currentHeight = 0;
        let horizontalOverflow = false;
        for (const [port, version] of [
          [baselinePort, 'baseline'],
          [currentPort, 'current'],
        ] as const) {
          const page = await context.newPage();
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const response = await page.goto(`http://127.0.0.1:${port}${route}`, {
            waitUntil: 'networkidle',
          });
          if (!response?.ok())
            throw new Error(`${version} ${route}: HTTP ${response?.status()}`);
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(
              [...document.images].map((image) =>
                image.decode().catch(() => {}),
              ),
            );
          });
          const layout = await page.evaluate(() => ({
            height: Math.ceil(document.documentElement.scrollHeight),
            overflow: document.documentElement.scrollWidth > innerWidth,
          }));
          if (version === 'baseline') baselineHeight = layout.height;
          else {
            currentHeight = layout.height;
            horizontalOverflow = layout.overflow;
          }
          const screenshot = Buffer.from(
            await page.screenshot({
              fullPage: true,
              animations: 'disabled',
              caret: 'hide',
            }),
          );
          captures.push(screenshot);
          if (errors.length)
            throw new Error(`${version} ${route}: ${errors.join('; ')}`);
          await page.close();
        }

        const baseline = await sharp(captures[0]).ensureAlpha().raw().toBuffer({
          resolveWithObject: true,
        });
        const current = await sharp(captures[1]).ensureAlpha().raw().toBuffer({
          resolveWithObject: true,
        });
        const height = Math.min(baseline.info.height, current.info.height);
        let changed = 0;
        const pixels = baseline.info.width * height;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < baseline.info.width; x++) {
            const offset = (y * baseline.info.width + x) * 4;
            const difference =
              Math.abs(baseline.data[offset] - current.data[offset]) +
              Math.abs(baseline.data[offset + 1] - current.data[offset + 1]) +
              Math.abs(baseline.data[offset + 2] - current.data[offset + 2]);
            if (difference > threshold) changed++;
          }
        }
        const changedPercent = (changed / pixels) * 100;
        results.push({
          route,
          width,
          theme,
          baselineHeight,
          currentHeight,
          heightDelta: currentHeight - baselineHeight,
          changedPercent,
          horizontalOverflow,
        });
        if (
          changedPercent > 0.5 ||
          currentHeight !== baselineHeight ||
          horizontalOverflow
        )
          mismatches.push({
            route,
            width,
            theme,
            baseline: captures[0],
            current: captures[1],
          });
        console.log(
          `${route} ${width}px ${theme}: diff=${changedPercent.toFixed(3)}%, height=${baselineHeight}→${currentHeight}px${horizontalOverflow ? ', overflow' : ''}`,
        );
      }
      await context.close();
    }
  }

  await Promise.all(
    mismatches.map(async ({ route, width, theme, baseline, current }) => {
      const slug =
        route === '/' ? 'home' : route.replaceAll('/', '_').replace(/^_/, '');
      const base = `artifacts/page-display-audit/${slug}-${width}-${theme}`;
      await Promise.all([
        writeFile(`${base}-baseline.png`, baseline),
        writeFile(`${base}-current.png`, current),
      ]);
    }),
  );
  const report = {
    baselineRoot,
    currentRoot,
    routes: baselineRoutes.sort(),
    widths,
    themes,
    threshold,
    results,
    summary: {
      pages: baselineRoutes.length,
      comparisons: results.length,
      overflowCount: results.filter((result) => result.horizontalOverflow)
        .length,
      heightMismatchCount: results.filter((result) => result.heightDelta !== 0)
        .length,
      aboveHalfPercentCount: results.filter(
        (result) => result.changedPercent > 0.5,
      ).length,
      maxDifferencePercent: Math.max(
        ...results.map((result) => result.changedPercent),
      ),
    },
  };
  await writeFile(
    'artifacts/page-display-audit/report.json',
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log('SUMMARY', JSON.stringify(report.summary));
  console.log(
    `Saved ${mismatches.length} screenshot pairs over the audit threshold.`,
  );
} finally {
  await browser.close();
  baselineServer.stop(true);
  currentServer.stop(true);
}
