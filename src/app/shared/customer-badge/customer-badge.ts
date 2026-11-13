import { Component, computed, input } from '@angular/core';

/** The initials of a name: the first letters of its first two words, or its first two letters. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const letters =
    words.length === 1 ? [...words[0]].slice(0, 2) : [[...words[0]][0], [...words[1]][0]];
  return letters.join('').toUpperCase();
}

/**
 * A customer's logo, or its initials when it has none: `row` is the initials tile of tree
 * table rows, `tile` the 36px tile of page headers, `preview` the large tile of the form.
 */
@Component({
  selector: 'app-customer-badge',
  templateUrl: './customer-badge.html',
  styleUrl: './customer-badge.css',
  host: {
    '[class.pt-initials]': "size() === 'row'",
    '[class.pt-color-tile]': "size() !== 'row'",
    '[class.preview]': "size() === 'preview'",
    '[class.has-logo]': '!!logo()',
    '[style.--row-color]': "logo() ? 'var(--surface)' : 'var(--track)'",
  },
})
export class CustomerBadge {
  readonly name = input.required<string>();
  readonly logo = input<string | null>(null);
  readonly size = input<'row' | 'tile' | 'preview'>('row');

  protected readonly initials = computed(() => initialsOf(this.name()));
}
