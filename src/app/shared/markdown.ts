import { marked } from 'marked';

/** The attributes that make a browser load a file as soon as their element is on the page. */
const LOADING_ATTRIBUTES = ['src', 'srcset', 'poster', 'background'];

/**
 * Renders a note's Markdown as HTML, line breaks kept. Showing it loads nothing from another
 * site (see `withoutRequests`). Bind it with [innerHTML], which runs it through Angular's
 * sanitizer, so scripts and handlers in a note never run. Style it with the global
 * `.pt-markdown` class (src/styles.css).
 */
export function renderMarkdown(text: string): string {
  return withoutRequests(marked.parse(text, { async: false, gfm: true, breaks: true }) as string);
}

/**
 * Takes out of a note's HTML what would load a file from another site, so a note from an
 * imported file can't report when it is read: an image from the web becomes a link to it, other
 * sources are dropped. Files inside the note itself (data URLs) stay.
 */
function withoutRequests(html: string): string {
  // A document of its own loads nothing while it is parsed.
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const selector = LOADING_ATTRIBUTES.map((name) => `[${name}]`).join();
  for (const element of body.querySelectorAll(selector)) {
    const source = element.getAttribute('src');
    for (const name of LOADING_ATTRIBUTES) {
      // A srcset is a list that can name files from the web beside a data URL.
      const embedded = name !== 'srcset' && element.getAttribute(name)?.startsWith('data:');
      if (!embedded) element.removeAttribute(name);
    }
    if (element.tagName === 'IMG' && source && !element.hasAttribute('src')) {
      const link = body.ownerDocument.createElement('a');
      link.setAttribute('href', source);
      link.textContent = element.getAttribute('alt') || source;
      element.replaceWith(link);
    }
  }
  return body.innerHTML;
}
