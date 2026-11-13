import { ICON_SERVICE, SiteIconError, fetchSiteIcon, siteHost } from './site-icon';

describe('siteHost', () => {
  it('takes the host name from an address as typed', () => {
    expect(siteHost('reply.com')).toBe('reply.com');
    expect(siteHost(' www.Reply.com/de ')).toBe('www.reply.com');
    expect(siteHost('https://www.reply.com/de/about?x=1')).toBe('www.reply.com');
  });

  it('refuses what is no web address', () => {
    expect(siteHost('')).toBeUndefined();
    expect(siteHost('reply')).toBeUndefined();
    expect(siteHost('ftp://reply.com')).toBeUndefined();
    expect(siteHost('not an address')).toBeUndefined();
  });
});

describe('fetchSiteIcon', () => {
  it('asks the icon service and returns the icon as a data URL', async () => {
    const load = vi.fn(
      async () => new Response('png', { headers: { 'Content-Type': 'image/png' } }),
    );
    const logo = await fetchSiteIcon('reply.com', load as unknown as typeof fetch);
    expect(load).toHaveBeenCalledWith(`${ICON_SERVICE}reply.com`);
    expect(logo.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('reports an icon that could not be loaded', async () => {
    const offline = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(fetchSiteIcon('reply.com', offline)).rejects.toBeInstanceOf(SiteIconError);
    const missing = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    await expect(fetchSiteIcon('reply.com', missing)).rejects.toBeInstanceOf(SiteIconError);
  });
});
