import { TestBed } from '@angular/core/testing';
import { SplitSegment, SplitSlider, SplitValues } from './split-slider';

describe('SplitSlider', () => {
  async function render(values: number[]) {
    const fixture = TestBed.createComponent(SplitSlider);
    const segments: SplitSegment[] = values.map((value, i) => ({
      id: `s${i}`,
      label: `S${i}`,
      color: 'var(--primary)',
      value,
    }));
    fixture.componentRef.setInput('segments', segments);
    const commits: SplitValues[] = [];
    fixture.componentInstance.commit.subscribe((v) => commits.push(v));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const handles = () => element.querySelectorAll<HTMLElement>('[data-handle]');
    const press = async (index: number, key: string) => {
      handles()[index].dispatchEvent(new KeyboardEvent('keydown', { key }));
      await fixture.whenStable();
    };
    return { element, handles, press, commits };
  }

  it('puts a handle between each two shares', async () => {
    const { handles } = await render([30, 45, 25]);
    expect([...handles()].map((h) => h.getAttribute('aria-valuenow'))).toEqual(['30', '75']);
  });

  it('keeps the sum at 100 and a boundary between its neighbors', async () => {
    const { press, commits } = await render([30, 45, 25]);
    await press(0, 'ArrowRight');
    expect(commits.at(-1)).toEqual([35, 40, 25]);
    await press(0, 'End');
    expect(commits.at(-1)).toEqual([75, 0, 25]);
    await press(1, 'Home');
    expect(commits.at(-1)).toEqual([75, 0, 25]);
    await press(1, 'End');
    expect(commits.at(-1)).toEqual([75, 25, 0]);
  });

  it('shows shares that do not add up to 100 as shares that do', async () => {
    const { element } = await render([30, 40, 25]);
    expect(element.querySelector('.legend')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'S0 30% S1 40% S2 30%',
    );
  });
});
