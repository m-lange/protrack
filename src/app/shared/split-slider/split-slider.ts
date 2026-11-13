import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { STRINGS } from '../../i18n/strings';

export interface SplitSegment {
  id: string;
  label: string;
  /** A CSS color, for example a category color variable. */
  color: string;
  /** The segment's share in percent. */
  value: number;
}

/** The shares of the segments, in segment order, adding up to 100. */
export type SplitValues = number[];

/**
 * One bar split into shares that always add up to 100%: a colored segment per share and a
 * handle between each two neighbors. Dragging or the arrow keys move a boundary in steps;
 * `preview` reports every move, `commit` the final values.
 */
@Component({
  selector: 'app-split-slider',
  templateUrl: './split-slider.html',
  styleUrl: './split-slider.css',
})
export class SplitSlider {
  protected readonly t = inject(STRINGS);

  readonly segments = input.required<SplitSegment[]>();
  readonly step = input(5);

  readonly preview = output<SplitValues>();
  readonly commit = output<SplitValues>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  /** The positions of the boundaries between segments, 0–100, rising. */
  protected readonly boundaries = linkedSignal(() => {
    let sum = 0;
    return this.segments()
      .slice(0, -1)
      .map((segment) => (sum = Math.min(100, sum + Math.max(0, segment.value))));
  });

  /** The segments with their shares as the boundaries draw them: they add up to 100. */
  protected readonly shown = computed(() => {
    const edges = [0, ...this.boundaries(), 100];
    return this.segments().map((segment, i) => ({ ...segment, value: edges[i + 1] - edges[i] }));
  });

  private dragging: number | null = null;

  protected pointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const at = this.percentAt(event.clientX);
    const handle = (event.target as HTMLElement).closest<HTMLElement>('[data-handle]');
    this.dragging = handle ? Number(handle.dataset['handle']) : this.nearest(at);
    this.track().nativeElement.setPointerCapture(event.pointerId);
    this.track()
      .nativeElement.querySelectorAll<HTMLElement>('[data-handle]')
      [this.dragging]?.focus();
    event.preventDefault();
    this.moveTo(this.dragging, at, false);
  }

  protected pointerMove(event: PointerEvent): void {
    if (this.dragging === null) return;
    this.moveTo(this.dragging, this.percentAt(event.clientX), false);
  }

  protected pointerUp(): void {
    if (this.dragging === null) return;
    this.dragging = null;
    this.commit.emit(this.values());
  }

  protected keyDown(index: number, event: KeyboardEvent): void {
    const at = this.boundaries()[index];
    const step = this.step();
    const target: Record<string, number> = {
      ArrowLeft: at - step,
      ArrowDown: at - step,
      ArrowRight: at + step,
      ArrowUp: at + step,
      PageDown: at - step * 2,
      PageUp: at + step * 2,
      Home: 0,
      End: 100,
    };
    if (!(event.key in target)) return;
    event.preventDefault();
    this.moveTo(index, target[event.key], true);
  }

  /** Moves a boundary, snapped to the step and kept between its neighbors. */
  private moveTo(index: number, percent: number, save: boolean): void {
    const edges = this.boundaries();
    const min = index === 0 ? 0 : edges[index - 1];
    const max = index === edges.length - 1 ? 100 : edges[index + 1];
    const snapped = Math.round(percent / this.step()) * this.step();
    const at = Math.min(max, Math.max(min, snapped));
    if (at !== edges[index]) {
      this.boundaries.set(edges.map((edge, i) => (i === index ? at : edge)));
      this.preview.emit(this.values());
    }
    if (save) this.commit.emit(this.values());
  }

  private values(): SplitValues {
    return this.shown().map((segment) => segment.value);
  }

  private percentAt(clientX: number): number {
    const rect = this.track().nativeElement.getBoundingClientRect();
    return rect.width ? ((clientX - rect.left) / rect.width) * 100 : 0;
  }

  /** The boundary closest to a point; of two at the same place, the one that can move there. */
  private nearest(percent: number): number {
    const edges = this.boundaries();
    let best = 0;
    edges.forEach((edge, i) => {
      const distance = Math.abs(edge - percent);
      const bestDistance = Math.abs(edges[best] - percent);
      if (distance < bestDistance || (distance === bestDistance && percent > edge)) best = i;
    });
    return best;
  }
}
