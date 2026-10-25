import { site } from '../data/site';
export function GET() {
  const preview =
    site.preview ||
    (import.meta.env.CF_PAGES_BRANCH &&
      import.meta.env.CF_PAGES_BRANCH !== 'main');
  return new Response(
    `User-agent: *\n${preview ? 'Disallow: /' : 'Allow: /'}\nSitemap: ${site.url}/sitemap-index.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
