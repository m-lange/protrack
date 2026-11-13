import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Shortcuts } from '../../../core/shortcuts';
import { STRINGS } from '../../../i18n/strings';
import { Icon } from '../../../shared/icon/icon';
import { CustomerList } from '../customer-list/customer-list';

/** My customers: a New customer button and the customer list, to add, edit and order customers. */
@Component({
  selector: 'app-customers-page',
  imports: [RouterLink, Icon, CustomerList],
  templateUrl: './customers-page.html',
  styleUrl: './customers-page.css',
})
export class CustomersPage {
  protected readonly t = inject(STRINGS);

  constructor() {
    const router = inject(Router);
    inject(Shortcuts).use({ create: () => void router.navigateByUrl('/customers/new') });
  }
}
