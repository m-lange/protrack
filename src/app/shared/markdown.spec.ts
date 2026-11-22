import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { renderMarkdown } from './markdown';

/** A note as [innerHTML] puts it on the page: rendered, then through Angular's sanitizer. */
function onPage(text: string): string {
  return TestBed.inject(DomSanitizer).sanitize(SecurityContext.HTML, renderMarkdown(text)) ?? '';
}

describe('renderMarkdown', () => {
  it('renders Markdown and keeps line breaks', () => {
    expect(onPage('**Workshop**\nwith the team')).toContain(
      '<p><strong>Workshop</strong><br>with the team</p>',
    );
  });

  it('turns an image from the web into a link, so showing a note loads nothing', () => {
    const html = onPage('![Plan](https://example.com/plan.png)');
    expect(html).not.toContain('<img');
    expect(html).toContain('<a href="https://example.com/plan.png">Plan</a>');
  });

  it('takes out whatever else in a note would load a file', () => {
    const html = onPage(
      [
        '<img src="https://example.com/a.png" srcset="https://example.com/b.png 2x">',
        '<video src="https://example.com/c.mp4" poster="https://example.com/d.png"></video>',
        '<audio src="https://example.com/e.mp3"></audio>',
        '<table background="https://example.com/f.png"><tr><td>x</td></tr></table>',
      ].join('\n\n'),
    );
    expect(html).not.toMatch(/(src|srcset|poster|background)=/);
  });

  it('keeps an image that is part of the note itself', () => {
    expect(onPage('![Dot](data:image/png;base64,iVBORw0KGgo=)')).toContain(
      '<img src="data:image/png;base64,iVBORw0KGgo=" alt="Dot">',
    );
  });

  it('never lets a script or a handler of a note through', () => {
    const html = onPage('<script>alert(1)</script><b onclick="alert(1)">x</b>[y](javascript:z)');
    expect(html).not.toMatch(/<script|onclick|href="javascript:/);
  });
});
