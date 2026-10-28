import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Overview · SalesPulse', loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard) },
  { path: 'orders', title: 'Orders · SalesPulse', loadComponent: () => import('./pages/orders').then((m) => m.Orders) },
  { path: 'products', title: 'Inventory · SalesPulse', loadComponent: () => import('./pages/products').then((m) => m.Products) },
  { path: 'customers', title: 'Customers · SalesPulse', loadComponent: () => import('./pages/customers').then((m) => m.Customers) },
  { path: '**', redirectTo: '' },
];
