export const site = {
  name: 'AI Love GPU',
  shortName: 'ALG',
  url: 'https://alg-sit.club',
  description:
    '芝浦工業大学の学生団体ALG（AI Love GPU）。共有GPU資源の運用、AI駆動開発、勉強会とセミナーを通じて、AIを学び、作り、使うための環境をつくります。',
  // 機能ブランチの検索拒否はisPreviewで引き続き適用する。
  preview: false,
  github: 'https://github.com/ALG-SIT/website',
  contactEmail: '',
  social: [] as { label: string; url: string }[],
};
export const navigation = [
  { href: '/about/', label: 'ALGについて' },
  { href: '/blog/', label: '記事' },
  { href: '/projects/', label: 'プロジェクト' },
  { href: '/join/', label: '入部案内' },
];
