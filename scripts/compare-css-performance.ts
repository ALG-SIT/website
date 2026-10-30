import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { load } from 'cheerio';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const baselineRoot = resolve(process.argv[2] ?? '/tmp/alg-lcp-before/dist');
const currentRoot = resolve(process.argv[3] ?? 'dist');
const runs = Number(process.argv[4] ?? 5);
const ports = { baseline: 4335, current: 4336 } as const;
const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function serve(root: string, port: number) {
  return Bun.serve({
    port,
    async fetch(request) {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      let filePath = resolve(root, `.${pathname}`);
      if (filePath !== root && !filePath.startsWith(`${root}/`))
        return new Response('Not found', { status: 404 });
      try {
        if ((await stat(filePath)).isDirectory())
          filePath = resolve(filePath, 'index.html');
        const bytes = await readFile(filePath);
        const headers = new Headers({
          'content-type':
            mimeTypes[extname(filePath)] ?? 'application/octet-stream',
          'cache-control': pathname.startsWith('/_astro/')
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=0, must-revalidate',
        });
        if (
          request.headers.get('accept-encoding')?.includes('gzip') &&
          bytes.length > 512
        ) {
          headers.set('content-encoding', 'gzip');
          headers.set('vary', 'accept-encoding');
          return new Response(gzipSync(bytes), { headers });
        }
        return new Response(bytes, { headers });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    },
  });
}

async function transferSizes(root: string, path: string) {
  const html = await readFile(resolve(root, `.${path}`, 'index.html'));
  const $ = load(html.toString());
  const stylesheets = $('link[rel="stylesheet"]')
    .toArray()
    .map((element) => $(element).attr('href'))
    .filter((href): href is string => Boolean(href));
  const css = await Promise.all(
    stylesheets.map(async (href) => {
      const pathname = new URL(href, 'https://local.test').pathname;
      return readFile(resolve(root, `.${pathname}`));
    }),
  );
  const htmlGzip = gzipSync(html).length;
  const cssGzip = css.reduce(
    (sum, stylesheet) => sum + gzipSync(stylesheet).length,
    0,
  );
  return {
    htmlGzip,
    cssGzip,
    coldGzip: htmlGzip + cssGzip,
    revisitGzip: htmlGzip,
  };
}

const baselineServer = serve(baselineRoot, ports.baseline);
const currentServer = serve(currentRoot, ports.current);
let chrome: Awaited<ReturnType<typeof launch>> | undefined;

try {
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const article = (
    await readdir(resolve(baselineRoot, 'blog'), { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))[0]?.name;
  const project = (
    await readdir(resolve(baselineRoot, 'projects'), { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))[0]?.name;
  const pages = [
    ['home', '/'],
    ['article', article ? `/blog/${article}/` : '/blog/'],
    ['project', project ? `/projects/${project}/` : '/projects/'],
  ] as const;
  const results: Array<{
    run: number;
    variant: 'baseline' | 'current';
    page: string;
    lcpMs: number;
    performance: number;
  }> = [];

  for (let run = 1; run <= runs; run++) {
    const order =
      run % 2 === 1
        ? (['baseline', 'current'] as const)
        : (['current', 'baseline'] as const);
    for (const variant of order) {
      for (const [page, path] of pages) {
        const result = await lighthouse(
          `http://127.0.0.1:${ports[variant]}${path}`,
          {
            port: chrome.port,
            output: 'json',
            onlyCategories: ['performance'],
          },
        );
        if (!result)
          throw new Error(`Lighthouse failed: ${variant} ${page} run ${run}`);
        const lcpMs =
          result.lhr.audits['largest-contentful-paint']?.numericValue;
        if (typeof lcpMs !== 'number')
          throw new Error(`LCP missing: ${variant} ${page} run ${run}`);
        results.push({
          run,
          variant,
          page,
          lcpMs,
          performance: Math.round(
            (result.lhr.categories.performance?.score ?? 0) * 100,
          ),
        });
        console.log(
          `${run}/${runs} ${variant} ${page}: LCP ${Math.round(lcpMs)}ms`,
        );
      }
    }
  }

  const summary = pages.map(([page]) => {
    const values = (variant: 'baseline' | 'current') =>
      results
        .filter((result) => result.page === page && result.variant === variant)
        .map((result) => result.lcpMs);
    const median = (numbers: number[]) => {
      const ordered = [...numbers].sort((a, b) => a - b);
      return ordered[Math.floor(ordered.length / 2)];
    };
    const before = median(values('baseline'));
    const after = median(values('current'));
    return {
      page,
      baselineMedianMs: before,
      currentMedianMs: after,
      deltaMs: after - before,
    };
  });
  const sizes = Object.fromEntries(
    await Promise.all(
      pages.map(async ([page, path]) => [
        page,
        {
          baseline: await transferSizes(baselineRoot, path),
          current: await transferSizes(currentRoot, path),
        },
      ]),
    ),
  );
  const report = {
    baselineRoot,
    currentRoot,
    runsPerVariant: runs,
    results,
    summary,
    sizes,
  };
  await mkdir('artifacts/css-migration/performance', { recursive: true });
  await writeFile(
    'artifacts/css-migration/performance/comparison.json',
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.table(summary);
  console.log('Transfer sizes (gzip bytes):', JSON.stringify(sizes, null, 2));
} finally {
  chrome?.kill();
  baselineServer.stop(true);
  currentServer.stop(true);
}
