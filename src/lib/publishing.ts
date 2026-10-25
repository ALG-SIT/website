export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isPublished(
  data: { draft: boolean; publishedAt?: Date },
  now = new Date(),
) {
  return !data.draft && (!data.publishedAt || data.publishedAt <= now);
}
export function comparePosts(
  a: { id: string; data: { publishedAt: Date } },
  b: { id: string; data: { publishedAt: Date } },
) {
  return (
    b.data.publishedAt.getTime() - a.data.publishedAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(date);
}
