import { TestBed } from '@angular/core/testing';
import { Placeholder } from './placeholder';

describe('Placeholder', () => {
  it('shows the name of its page', async () => {
    await TestBed.configureTestingModule({ imports: [Placeholder] }).compileComponents();
    const fixture = TestBed.createComponent(Placeholder);
    fixture.componentRef.setInput('page', 'year');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe('My year');
  });
});
