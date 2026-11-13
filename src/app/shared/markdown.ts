import { marked } from 'marked';

/**
 * Renders a note's Markdown as HTML, line breaks kept. Bind it with [innerHTML], which runs it
 * through Angular's sanitizer, so scripts and handlers in a note never run. Style it with the
 * global `.pt-markdown` class (src/styles.css).
 */
export function renderMarkdown(text: string): string {
  return marked.parse(text, { async: false, gfm: true, breaks: true }) as string;
}
