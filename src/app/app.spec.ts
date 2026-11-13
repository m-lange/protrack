import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { TODAY } from './core/today';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: TODAY, useValue: new Date(2026, 10, 6) }],
    }).compileComponents();
  });

  it('renders the shell: top bar, navigation and page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.pt-topbar')).toBeTruthy();
    expect(element.querySelector('nav[aria-label="Primary"]')).toBeTruthy();
    expect(element.querySelector('main.pt-page')).toBeTruthy();
  });
});
