import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { postPages, projectPages, searchablePages } from './content';

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 375, 768, 1280]) {
    test(`${colorScheme} ${width}px: 主要ページに横スクロールと重大なアクセシビリティ違反がない`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
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
}
test('ロゴの背景は透明で、文字だけがテーマ色に追従する', async ({ page }) => {
  await page.goto('/');
  const select = page.getByRole('combobox', { name: '表示テーマ' });
  const ink = page.locator('.hero-logo [data-brand-part="ink"]');
  const caption = page.locator('.hero-logo [data-brand-part="caption"]');
  const heart = page.locator('.hero-logo [data-brand-part="heart"]');
  const line = page.locator('.hero-logo [data-brand-part="line"]');
  const colorOf = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).fill);
  await select.selectOption('light');
  await expect(ink).toHaveCSS('fill', 'rgb(23, 23, 23)');
  await expect(caption).toHaveCSS('fill', 'rgb(98, 91, 96)');
  const heartColor = await heart.evaluate((el) => getComputedStyle(el).fill);
  const lineColor = await line.evaluate((el) => getComputedStyle(el).fill);
  const wordmarkHeart = await colorOf('.brand-wordmark path');
  await expect(page.locator('.brand-wordmark text').first()).toHaveCSS(
    'fill',
    'rgb(23, 23, 23)',
  );
  await select.selectOption('dark');
  await expect(ink).toHaveCSS('fill', 'rgb(248, 244, 246)');
  await expect(caption).toHaveCSS('fill', 'rgb(196, 186, 193)');
  await expect(page.locator('.brand-wordmark text').first()).toHaveCSS(
    'fill',
    'rgb(248, 244, 246)',
  );
  await expect(heart).toHaveCSS('fill', heartColor);
  await expect(line).toHaveCSS('fill', lineColor);
  expect(await colorOf('.brand-wordmark path')).toBe(wordmarkHeart);
  await expect(page.locator('.hero-logo')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator('.hero-logo')).toHaveCSS('box-shadow', 'none');
  for (const brand of await page.locator('.brand').all()) {
    await expect(brand).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
  await expect(
    page.locator('.brand-wordmark rect, .brand-square rect'),
  ).toHaveCount(2);
  const logoBox = await page.locator('.brand-square').boundingBox();
  expect(logoBox).not.toBeNull();
  expect(Math.abs((logoBox?.width ?? 0) - (logoBox?.height ?? 0))).toBeLessThan(
    1,
  );
});

test('日本語検索は記事・プロジェクトだけを対象にし、Escapeで閉じてフォーカスを戻す', async ({
  page,
}) => {
  const searchPage = searchablePages[0];
  if (!searchPage) {
    test.skip(true, '検索対象の公開コンテンツがありません');
    return;
  }
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  expect(pageErrors).toEqual([]);
  const search = page.getByRole('button', { name: 'サイト内を検索' });
  await search.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('searchbox').fill(searchPage.title);
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
  const searchPage = searchablePages[0];
  if (!searchPage) {
    test.skip(true, '検索対象の公開コンテンツがありません');
    return;
  }
  await page.goto('/');
  await page.route('**/pagefind/pagefind.js', (route) => route.abort());
  await page.getByRole('button', { name: 'サイト内を検索' }).click();
  await page.getByRole('searchbox').fill(searchPage.title);
  await expect(page.getByRole('status')).toContainText('読み込めませんでした');
  await page.unroute('**/pagefind/pagefind.js');
  await page.getByRole('searchbox').fill('');
  await page.getByRole('searchbox').fill(searchPage.title);
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
test('テーマはOS追従・手動固定・システムへの復帰と保存に対応する', async ({
  page,
}) => {
  await page.goto('/');
  const select = page.getByRole('combobox', { name: '表示テーマ' });
  const html = page.locator('html');
  const themeColor = page.locator('meta[name="theme-color"]').first();
  await expect(select).toHaveValue('system');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(themeColor).toHaveAttribute('content', '#ffffff');
  await select.selectOption('dark');
  await page.reload();
  await expect(select).toHaveValue('dark');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(themeColor).toHaveAttribute('content', '#171417');
  await page.emulateMedia({ colorScheme: 'dark' });
  await select.selectOption('light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveAttribute('data-theme', 'light');
  await select.selectOption('system');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(select).toHaveValue('system');
  expect(await page.evaluate(() => localStorage.getItem('alg-theme'))).toBe(
    'system',
  );
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
  // Native select remains usable from the keyboard.
  await select.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toHaveValue('light');
});

for (const stored of ['light', 'dark', 'unexpected']) {
  test(`既存のテーマ設定を引き継ぎ、不正値はOS追従にする: ${stored}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('alg-theme', value),
      stored,
    );
    await page.goto('/');
    await expect(
      page.getByRole('combobox', { name: '表示テーマ' }),
    ).toHaveValue(stored === 'unexpected' ? 'system' : stored);
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      stored === 'light' ? 'light' : 'dark',
    );
  });
}

test('保存不可時も手動テーマを保持し、システムへ戻せる', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/');
  const select = page.getByRole('combobox', { name: '表示テーマ' });
  await expect(select).toHaveValue('system');
  await select.selectOption('light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await select.selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await select.selectOption('dark');
  await page.reload();
  await expect(select).toHaveValue('system');
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
  if (!codePost) {
    test.skip(true, 'コードと目次を持つ公開記事がありません');
    return;
  }
  await page.goto(codePost.path);
  const anchor = page
    .getByRole('navigation', { name: 'この記事の目次' })
    .getByRole('link', { name: codePost.heading, exact: true });
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
    colorScheme: 'dark',
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/blog/');
  await expect(
    page.getByRole('combobox', { name: '表示テーマ' }),
  ).not.toBeVisible();
  expect(
    await page
      .locator('html')
      .evaluate((el) => getComputedStyle(el).colorScheme),
  ).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  expect(
    await page
      .locator('html')
      .evaluate((el) => getComputedStyle(el).colorScheme),
  ).toBe('light');
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
