import { describe, expect, test } from 'bun:test';
import { site } from '../../src/data/site';
import { breadcrumbList, isPreview, organization } from '../../src/lib/seo';

describe('検索公開ポリシー', () => {
  test('プレビュー設定とmain以外のブランチでは検索を拒否する', () => {
    for (const branch of [undefined, '', 'main', 'feature/seo']) {
      expect(isPreview(true, branch)).toBe(true);
    }
    expect(isPreview(false, 'feature/seo')).toBe(true);
    expect(isPreview(false, 'main')).toBe(false);
    expect(isPreview(false)).toBe(false);
  });
});

describe('構造化データ', () => {
  test('GitHubなしでもSNSを出力し、空のsameAsは省略する', () => {
    expect(
      organization({ ...site, github: '', social: [] }).sameAs,
    ).toBeUndefined();
    expect(
      organization({
        ...site,
        github: '',
        social: [{ label: 'SNS', url: 'https://example.com/alg' }],
      }).sameAs,
    ).toEqual(['https://example.com/alg']);
  });
  test('パンくずの順序と正規URLを保持する', () => {
    expect(
      breadcrumbList([
        { name: 'ホーム', path: '/' },
        { name: '記事', path: '/blog/' },
      ]).itemListElement,
    ).toMatchObject([
      { position: 1, name: 'ホーム', item: `${site.url}/` },
      { position: 2, name: '記事', item: `${site.url}/blog/` },
    ]);
  });
});
