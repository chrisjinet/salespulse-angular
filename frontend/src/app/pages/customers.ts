import { Component, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { Customer } from '../core/api';
import { initials, money, shortDate } from '../core/format';
import { ErrorState, Icon } from '../shared/ui';

const AVATAR_GRADIENTS = [
  'from-indigo-400 to-violet-500', 'from-sky-400 to-indigo-500', 'from-fuchsia-400 to-pink-500',
  'from-emerald-400 to-teal-500', 'from-amber-300 to-orange-500',
];

@Component({
  selector: 'app-customers',
  imports: [Icon, ErrorState],
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <p class="text-sm font-medium text-indigo-300">Accounts</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight text-white">Customers</h1>
        <p class="mt-1 text-sm text-slate-400">Ranked by lifetime value · {{ rows().length }} shown</p>
      </div>
      <label class="relative w-full sm:w-80">
        <app-icon name="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input class="input w-full pl-9" placeholder="Search name, company, email" aria-label="Search customers"
          [value]="search()" (input)="search.set($any($event.target).value)" />
      </label>
    </header>

    @if (customers.error()) {
      <div class="mt-6"><app-error /></div>
    } @else if (!customers.hasValue()) {
      <div class="skeleton mt-6 h-[480px]"></div>
    } @else {
      <div class="glass mt-6 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-5 py-3.5 font-medium">Customer</th>
                <th class="hidden px-5 py-3.5 font-medium md:table-cell">Company</th>
                <th class="hidden px-5 py-3.5 font-medium lg:table-cell">Region</th>
                <th class="px-5 py-3.5 text-right font-medium">Orders</th>
                <th class="px-5 py-3.5 font-medium">Lifetime value</th>
                <th class="hidden px-5 py-3.5 font-medium md:table-cell">Last order</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]">
              @for (c of rows(); track c.id) {
                <tr class="transition hover:bg-white/[0.03]">
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-3">
                      <span class="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white"
                        [class]="gradient(c.id)">{{ initials(c.name) }}</span>
                      <div class="min-w-0">
                        <div class="font-medium text-white">{{ c.name }}</div>
                        <div class="truncate text-xs text-slate-500">{{ c.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="hidden px-5 py-3 text-slate-300 md:table-cell">{{ c.company }}</td>
                  <td class="hidden px-5 py-3 text-slate-400 lg:table-cell">{{ c.region }}</td>
                  <td class="px-5 py-3 text-right tabular-nums text-slate-300">{{ c.orderCount }}</td>
                  <td class="px-5 py-3">
                    <div class="flex min-w-36 items-center gap-3">
                      <span class="w-16 font-semibold tabular-nums text-white">{{ money(c.lifetimeValue, true) }}</span>
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div class="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                          [style.width.%]="(c.lifetimeValue / maxLtv()) * 100"></div>
                      </div>
                    </div>
                  </td>
                  <td class="hidden px-5 py-3 text-slate-400 md:table-cell">{{ c.lastOrder ? shortDate(c.lastOrder) : '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-5 py-16 text-center text-slate-500">No customers match “{{ search() }}”.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class Customers {
  protected readonly money = money;
  protected readonly shortDate = shortDate;
  protected readonly initials = initials;

  protected readonly customers = httpResource<Customer[]>(() => '/api/customers');
  protected readonly search = signal('');

  private readonly all = computed(() => (this.customers.hasValue() ? this.customers.value() : []));
  protected readonly maxLtv = computed(() => this.all()[0]?.lifetimeValue || 1);
  protected readonly rows = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.all().filter((c) => [c.name, c.company, c.email].some((f) => f.toLowerCase().includes(term)));
  });

  protected gradient(id: number) {
    return AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length];
  }
}
