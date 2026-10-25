import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { postPages, projectPages, searchablePages } from './content';

for (const width of [375, 768, 1280]) {
  test(`${width}px: 主要ページに横スクロールと重大なアクセシビリティ違反がない`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/',
      '/blog/',
      ...(postPages[0] ? [postPages[0].path] : []),
      ...(projectPages[0] ? [projectPages[0].path] : []),
      '/join/',
    ]) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const accessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        accessibility.violations,
        `${path}: ${JSON.stringify(accessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
      ).toEqual([]);
    }
  });
}
test('日本語検索は記事・プロジェクトだけを対象にし、Escapeで閉じてフォーカスを戻す', async ({
  page,
}) => {
  test.skip(!searchablePages.length, '検索対象の公開コンテンツがありません');
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  expect(pageErrors).toEqual([]);
  const search = page.getByRole('button', { name: 'サイト内を検索' });
  await search.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('searchbox').fill(searchablePages[0]!.title);
  await expect(page.locator('#search-results a').first()).toBeVisible({
    timeout: 15000,
  });
  const links = await page
    .locator('#search-results a')
    .evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  expect(links.length).toBeGreaterThan(0);
  expect(
    links.every(
      (href) => href?.startsWith('/blog/') || href?.startsWith('/projects/'),
    ),
  ).toBe(true);
  await page.getByRole('searchbox').fill('zzzxqv9481nonexistent');
  await expect(page.getByRole('status')).toContainText('見つかりませんでした');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(search).toBeFocused();
  expect(pageErrors).toEqual([]);
});
test('検索の読み込み失敗から再試行できる', async ({ page }) => {
  test.skip(!searchablePages.length, '検索対象の公開コンテンツがありません');
  await page.goto('/');
  await page.route('**/pagefind/pagefind.js', (route) => route.abort());
  await page.getByRole('button', { name: 'サイト内を検索' }).click();
  await page.getByRole('searchbox').fill(searchablePages[0]!.title);
  await expect(page.getByRole('status')).toContainText('読み込めませんでした');
  await page.unroute('**/pagefind/pagefind.js');
  await page.getByRole('searchbox').fill('');
  await page.getByRole('searchbox').fill(searchablePages[0]!.title);
  await expect(page.locator('#search-results a').first()).toBeVisible({
    timeout: 15000,
  });
});
test('カテゴリーの絞り込みと解除', async ({ page }) => {
  await page.goto('/blog/');
  const expected = await page
    .locator('.post-card[data-category="tech"]')
    .count();
  await page.getByRole('button', { name: '技術記事', exact: true }).click();
  await expect(page.locator('.post-card:visible')).toHaveCount(expected);
  await expect(page.getByRole('status')).toContainText(`${expected}件`);
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  await expect(page.locator('.post-card:visible')).toHaveCount(
    postPages.length,
  );
});
test('テーマ選択を保存し、ストレージが使えなくても動作する', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'ライトモードに切り替え' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'ライトモードに切り替え' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
test('モバイルメニューの開閉とEscape操作', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'メニューを開く' }).click();
  await expect(
    page.getByRole('navigation', { name: 'モバイルナビゲーション' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('navigation', { name: 'モバイルナビゲーション' }),
  ).not.toBeVisible();
});
test('記事目次とコードコピーを利用できる', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const codePost = postPages.find((post) => post.hasCode && post.heading);
  test.skip(!codePost, 'コードと目次を持つ公開記事がありません');
  await page.goto(codePost!.path);
  const anchor = page
    .getByRole('navigation', { name: 'この記事の目次' })
    .getByRole('link', { name: codePost!.heading, exact: true });
  await anchor.click();
  expect(page.url()).toContain('#');
  await page.getByRole('button', { name: 'コードをコピー' }).first().click();
  await expect(
    page.getByRole('button', { name: 'コードをコピー' }).first(),
  ).toHaveText('コピーしました');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await page.locator('.prose pre code').first().textContent(),
  );
});
test('JavaScriptなしでも本文・ナビゲーション・記事一覧を読める', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/blog/');
  await expect(page.locator('.post-card')).toHaveCount(postPages.length);
  await expect(
    page.getByRole('navigation', { name: 'モバイルナビゲーション' }),
  ).toBeVisible();
  if (postPages.length) {
    await page.locator('.post-card h3 a').first().click();
    await expect(page.locator('.prose')).toBeVisible();
  }
  await context.close();
});
test('404ページからホームへ戻れる', async ({ page }) => {
  const response = await page.goto('/missing-page/');
  expect(response?.status()).toBe(404);
  await page.getByRole('link', { name: 'ホームに戻る' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4322/');
});

test('ライトモードでも文字とコードのコントラストを満たす', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  for (const path of [
    '/',
    ...(postPages[0] ? [postPages[0].path] : []),
    '/join/',
  ]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
});
