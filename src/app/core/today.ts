import { InjectionToken } from '@angular/core';

/** Today's date. Override it in tests to pin the date. */
export const TODAY = new InjectionToken<Date>('TODAY', {
  providedIn: 'root',
  factory: () => new Date(),
});
