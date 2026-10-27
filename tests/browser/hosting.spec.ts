import { expect, test } from '@playwright/test';

test('Static AssetsはHTMLの末尾スラッシュと404を処理する', async ({
  request,
}) => {
  const redirect = await request.get('/about', { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  expect(new URL(redirect.headers().location, redirect.url()).pathname).toBe(
    '/about/',
  );
  expect((await request.get('/about/')).status()).toBe(200);

  const missing = await request.get('/missing/nested/page/');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('noindex');
});

test('Static Assetsはセキュリティ・キャッシュヘッダーを適用する', async ({
  request,
}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['referrer-policy']).toBe(
    'strict-origin-when-cross-origin',
  );
  expect(response.headers()['permissions-policy']).toBe(
    'camera=(), microphone=(), geolocation=()',
  );
  expect(response.headers()['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  );

  const html = await response.text();
  const asset = html.match(/(?:src|href)="(\/_astro\/[^"]+)"/)?.[1];
  expect(asset).toBeDefined();
  const cached = await request.get(asset as string);
  expect(cached.status()).toBe(200);
  expect(cached.headers()['cache-control']).toBe(
    'public, max-age=31536000, immutable',
  );
  const search = await request.get('/pagefind/pagefind.js');
  expect(search.status()).toBe(200);
  expect(search.headers()['cache-control']).toBe(
    'public, max-age=0, must-revalidate',
  );
});
