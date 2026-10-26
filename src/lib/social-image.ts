import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { defaultSocialImage, type SocialImage } from './seo';

export async function socialImage(
  cover?: ImageMetadata,
  alt?: string,
): Promise<SocialImage> {
  if (!cover) return defaultSocialImage;
  const width = Math.min(1200, cover.width);
  const height = Math.max(1, Math.round((width * cover.height) / cover.width));
  const image = await getImage({ src: cover, width, height, format: 'png' });
  return { src: image.src, width, height, type: 'image/png', alt: alt ?? '' };
}
