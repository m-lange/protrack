import { LogoError, MAX_LOGO_BYTES, logoTypeOf, readLogo } from './logo-file';

describe('logo files', () => {
  it('knows SVG, PNG and JPEG by MIME type or, without one, by extension', () => {
    expect(logoTypeOf(new File([''], 'a.svg', { type: 'image/svg+xml' }))).toBe('image/svg+xml');
    expect(logoTypeOf(new File([''], 'a.SVG'))).toBe('image/svg+xml');
    expect(logoTypeOf(new File([''], 'a.jpg'))).toBe('image/jpeg');
    expect(logoTypeOf(new File([''], 'a.png', { type: 'image/png' }))).toBe('image/png');
    expect(logoTypeOf(new File([''], 'a.gif', { type: 'image/gif' }))).toBeUndefined();
  });

  it('reads an SVG as a data URL', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.svg');
    expect(await readLogo(file)).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('refuses other types, large files and fake SVGs', async () => {
    const problem = (file: File) =>
      readLogo(file).then(
        () => undefined,
        (error: LogoError) => error.problem,
      );
    expect(await problem(new File(['x'], 'a.gif', { type: 'image/gif' }))).toBe('type');
    const large = new File([new Uint8Array(MAX_LOGO_BYTES + 1)], 'a.png', { type: 'image/png' });
    expect(await problem(large)).toBe('size');
    expect(await problem(new File(['hello'], 'a.svg'))).toBe('notSvg');
  });
});
