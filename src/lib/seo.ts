import { site } from '../data/site';

export interface SocialImage {
  src: string;
  width: number;
  height: number;
  type: string;
  alt: string;
}

export interface Breadcrumb {
  name: string;
  path: string;
}

export const defaultSocialImage: SocialImage = {
  src: '/og.png',
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'Ai Love GPU（ALG）— 好奇心を、動かそう。',
};

export const organizationId = new URL('/#organization', site.url).href;

export function isPreview(preview: boolean, branch?: string): boolean {
  return preview || (!!branch && branch !== 'main');
}

export function organization(data = site) {
  const sameAs = [
    ...new Set(
      [data.github, ...data.social.map((s) => s.url)]
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': new URL('/#organization', data.url).href,
    name: data.name,
    alternateName: data.shortName,
    url: new URL('/', data.url).href,
    logo: new URL('/brand-square.svg', data.url).href,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbList(items: Breadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, site.url).href,
    })),
  };
}
