import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS, IconName } from './icons';

export type { IconName } from './icons';

/**
 * 13–20px for icons (see the design system); 32px for the logo mark, 44px for the logo in the
 * top bar, as tall as the year switcher.
 */
export type IconSize = 13 | 14 | 16 | 18 | 20 | 32 | 44;

const cache = new Map<string, string>();

/**
 * Prepares an SVG file for inline use: sets the size and stroke width on the root element,
 * draws every colored stroke and fill in currentColor and hides it from screen readers.
 */
export function renderIcon(source: string, size: number, strokeWidth: number): string {
  const key = `${source}|${size}|${strokeWidth}`;
  let svg = cache.get(key);
  if (!svg) {
    svg = source
      .trim()
      .replace(/(stroke|fill)="(?!none|currentColor)[^"]*"/g, '$1="currentColor"')
      .replace(/<svg\b([^>]*)>/, (_, attributes: string) => {
        const kept = attributes.replace(
          /\s(width|height|stroke-width|aria-hidden|focusable)="[^"]*"/g,
          '',
        );
        return `<svg${kept} width="${size}" height="${size}" stroke-width="${strokeWidth}" aria-hidden="true" focusable="false">`;
      });
    cache.set(key, svg);
  }
  return svg;
}

/** A line icon from src/icons, drawn in currentColor. */
@Component({
  selector: 'app-icon',
  template: '',
  styleUrl: './icon.css',
  host: { '[innerHTML]': 'svg()' },
})
export class Icon {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  readonly size = input<IconSize>(16);

  protected readonly svg = computed<SafeHtml>(() => {
    // 1.5, the weight of Streamline Ultimate Regular, or 1.8 at 13–14px. Expand/collapse
    // chevrons are drawn at 2 by a rule in styles.css.
    const stroke = this.size() <= 14 ? 1.8 : 1.5;
    // The SVG files are part of the app's own source, so they are trusted.
    return this.sanitizer.bypassSecurityTrustHtml(
      renderIcon(ICONS[this.name()], this.size(), stroke),
    );
  });
}
