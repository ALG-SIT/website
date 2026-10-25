export const tags = {
  ai: 'AI・機械学習',
  gpu: 'GPU',
  python: 'Python',
  web: 'Web',
  community: 'サークル活動',
} as const;
export type TagId = keyof typeof tags;
export const categories = {
  tech: '技術記事',
  activity: '活動報告',
  news: 'お知らせ',
} as const;
export const statuses = {
  planning: '企画中',
  active: '開発中',
  completed: '完成',
  archived: 'アーカイブ',
} as const;
