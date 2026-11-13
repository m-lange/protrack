import { LOGO_TYPES, LogoType } from '../../core/data/model';
import { readLogo } from './logo-file';

/**
 * The icon service that finds a website's best icon: the largest of its apple-touch-icon, web
 * manifest (PWA) icons and favicon, up to 256px. Browsers may only read images from services
 * that allow it (CORS); icon.horse does, Google's and DuckDuckGo's favicon services don't.
 * It sees the domain that is looked up.
 */
export const ICON_SERVICE = 'https://icon.horse/icon/';

/** Why no icon came back. The strings file has a message for each (`logoImport.errors`). */
export type SiteIconProblem = 'address' | 'unreachable';

export class SiteIconError extends Error {
  constructor(readonly problem: SiteIconProblem) {
    super(problem);
  }
}

/**
 * The host name of a web address as typed: "reply.com", "www.reply.com/de" or
 * "https://www.reply.com/de/about". Undefined when it is no web address.
 */
export function siteHost(address: string): string | undefined {
  const trimmed = address.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    const host = url.hostname.toLowerCase();
    return /^[a-z\d-]+(\.[a-z\d-]+)+$/.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Loads the icon of a website through the icon service, as a logo data URL. Rejects with a
 * SiteIconError when it can't be loaded, or a LogoError when it is no usable logo.
 */
export async function fetchSiteIcon(host: string, load: typeof fetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await load(ICON_SERVICE + encodeURIComponent(host));
  } catch {
    throw new SiteIconError('unreachable');
  }
  if (!response.ok) throw new SiteIconError('unreachable');
  const blob = await response.blob();
  const type = blob.type.split(';')[0].trim() as LogoType;
  const file = LOGO_TYPES.includes(type)
    ? new File([blob], host, { type })
    : new File([await toPng(blob)], host, { type: 'image/png' });
  return readLogo(file);
}

/** Converts another image type the service may send (ICO, WebP, GIF) to PNG. */
async function toPng(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((png) => (png ? resolve(png) : reject()), 'image/png'),
    );
  } catch {
    throw new SiteIconError('unreachable');
  }
}

/** The pixel size of an image data URL, or undefined when it can't be read (or SVG without one). */
export function imageSize(src: string): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve(
        image.naturalWidth ? { width: image.naturalWidth, height: image.naturalHeight } : undefined,
      );
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}
