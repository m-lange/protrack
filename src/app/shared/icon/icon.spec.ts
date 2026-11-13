import { TestBed } from '@angular/core/testing';
import { Icon, renderIcon } from './icon';

describe('Icon', () => {
  async function render(inputs: Record<string, unknown>) {
    await TestBed.configureTestingModule({ imports: [Icon] }).compileComponents();
    const fixture = TestBed.createComponent(Icon);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('svg')!;
  }

  it('renders the SVG file as a hidden currentColor icon at the given size', async () => {
    const svg = await render({ name: 'home', size: 18 });
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
    expect(svg.querySelectorAll('path').length).toBe(2);
  });

  it('uses a heavier stroke at 13–14px', async () => {
    const svg = await render({ name: 'lock', size: 14 });
    expect(svg.getAttribute('stroke-width')).toBe('1.8');
  });

  it('turns any color in a file into currentColor', () => {
    const svg = renderIcon(
      '<svg width="24" height="24" stroke="#123456" fill="red"><path fill="none" stroke="#fff"/></svg>',
      16,
      2,
    );
    expect(svg).toBe(
      '<svg stroke="currentColor" fill="currentColor" width="16" height="16" stroke-width="2" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor"/></svg>',
    );
  });
});
