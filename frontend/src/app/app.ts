import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from './shared/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './app.html',
})
export class App {
  protected readonly navOpen = signal(false);
  protected readonly nav = [
    { path: '/', label: 'Overview', icon: 'grid' },
    { path: '/orders', label: 'Orders', icon: 'receipt' },
    { path: '/products', label: 'Inventory', icon: 'cube' },
    { path: '/customers', label: 'Customers', icon: 'users' },
  ];
}
