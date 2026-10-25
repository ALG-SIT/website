import { describe, expect, test } from 'bun:test';
import {
  comparePosts,
  formatDate,
  isPublished,
  slugPattern,
} from '../../src/lib/publishing';
describe('公開ポリシー', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  test('下書きと将来記事を除外し、公開日時到来時には公開対象になる', () => {
    expect(isPublished({ draft: true }, now)).toBe(false);
    expect(
      isPublished(
        { draft: false, publishedAt: new Date('2026-10-26T00:00:00Z') },
        now,
      ),
    ).toBe(false);
    expect(isPublished({ draft: false, publishedAt: now }, now)).toBe(true);
    expect(isPublished({ draft: false }, now)).toBe(true);
  });
  test('同日記事はslugで安定した順序にする', () => {
    const entries = [
      { id: 'b', data: { publishedAt: now } },
      { id: 'a', data: { publishedAt: now } },
      { id: 'old', data: { publishedAt: new Date('2026-01-01') } },
    ];
    expect(entries.sort(comparePosts).map((entry) => entry.id)).toEqual([
      'a',
      'b',
      'old',
    ]);
  });
  test('slugは安全な単一階層に限定する', () => {
    expect(slugPattern.test('gpu-101')).toBe(true);
    for (const invalid of [
      'GPU',
      '日本語',
      '../draft',
      'nested/path',
      '-post',
      'post-',
      'post--name',
    ])
      expect(slugPattern.test(invalid)).toBe(false);
  });
  test('日付は実行マシンのタイムゾーンに依存しない', () => {
    expect(formatDate(new Date('2026-10-24T16:00:00Z'))).toBe('2026/10/25');
  });
});
