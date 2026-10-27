import { site } from '../data/site';
import { isPreview } from '../lib/seo';
export function GET() {
  const preview = isPreview(site.preview, import.meta.env.WORKERS_CI_BRANCH);
  return new Response(
    `User-agent: *\n${preview ? 'Disallow: /' : 'Allow: /'}\nSitemap: ${site.url}/sitemap-index.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
