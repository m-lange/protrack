import { LogoType } from '../../core/data/model';

/** The largest logo file ProTrack keeps. Logos travel inside the sync file. */
export const MAX_LOGO_BYTES = 1024 * 1024;

const TYPE_BY_EXTENSION: Record<string, LogoType> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

/** The logo type of a file, from its MIME type or, when the system reports none, its extension. */
export function logoTypeOf(file: File): LogoType | undefined {
  const byType = Object.values(TYPE_BY_EXTENSION).find((type) => type === file.type);
  if (byType) return byType;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return file.type ? undefined : TYPE_BY_EXTENSION[extension];
}

/** Why a logo file was refused. The strings file has a message for each (`logoErrors`). */
export type LogoProblem = 'type' | 'size' | 'notSvg' | 'unreadable';

export class LogoError extends Error {
  constructor(readonly problem: LogoProblem) {
    super(problem);
  }
}

/**
 * Reads a logo file as a data URL. Rejects with a LogoError when the file is not SVG, PNG or
 * JPEG, is too large or is not an SVG image at all.
 */
export async function readLogo(file: File): Promise<string> {
  const type = logoTypeOf(file);
  if (!type) throw new LogoError('type');
  if (file.size > MAX_LOGO_BYTES) throw new LogoError('size');
  if (type === 'image/svg+xml' && !/<svg[\s>]/i.test(await file.text())) {
    throw new LogoError('notSvg');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new LogoError('unreadable'));
    reader.readAsDataURL(new Blob([file], { type }));
  });
}
