import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { ApiService, ORDER_STATUSES, type OrderDetail, type OrderListItem, type OrderStatus, type Paged } from '../core/api';
import { money, shortDate } from '../core/format';
import { ErrorState, Icon, StatusBadge } from '../shared/ui';

type SortKey = 'date' | 'customer' | 'total';
const PAGE_SIZE = 12;

@Component({
  selector: 'app-orders',
  imports: [Icon, StatusBadge, ErrorState],
  host: { '(document:keydown.escape)': 'selectedId.set(null)' },
  template: `
    <header class="animate-fade-in">
      <p class="text-sm font-medium text-indigo-300">Sales</p>
      <h1 class="mt-1 text-3xl font-semibold tracking-tight text-white">Orders</h1>
      <p class="mt-1 text-sm text-slate-400">
        {{ rows() ? rows()!.total.toLocaleString() + ' orders' : 'Loading…' }}
      </p>
    </header>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <label class="relative min-w-64 flex-1 sm:max-w-sm">
        <app-icon name="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input class="input w-full pl-9" placeholder="Search order, customer or company" aria-label="Search orders"
          [value]="search()" (input)="search.set($any($event.target).value)" />
      </label>
      <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
        @for (s of statusTabs; track s) {
          <button type="button" role="tab" [attr.aria-selected]="status() === s" (click)="status.set(s)"
            class="rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition"
            [class]="status() === s ? 'bg-indigo-500/20 text-white ring-indigo-400/40' : 'text-slate-400 ring-white/10 hover:text-white'">
            {{ s || 'All' }}
          </button>
        }
      </div>
      @if (orders.isLoading()) { <span class="text-xs text-slate-500">Updating…</span> }
    </div>

    @if (orders.error()) {
      <div class="mt-6"><app-error /></div>
    } @else {
      <div class="glass mt-4 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-5 py-3.5 font-medium">Order</th>
                <th class="px-5 py-3.5 font-medium"><button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-white" (click)="sort('customer')">Customer <app-icon name="sort" class="size-3.5" [class.text-indigo-300]="sortBy() === 'customer'" /></button></th>
                <th class="hidden px-5 py-3.5 font-medium md:table-cell">Region</th>
                <th class="px-5 py-3.5 font-medium"><button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-white" (click)="sort('date')">Date <app-icon name="sort" class="size-3.5" [class.text-indigo-300]="sortBy() === 'date'" /></button></th>
                <th class="px-5 py-3.5 font-medium">Status</th>
                <th class="px-5 py-3.5 text-right font-medium"><button type="button" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-white" (click)="sort('total')">Total <app-icon name="sort" class="size-3.5" [class.text-indigo-300]="sortBy() === 'total'" /></button></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/[0.04]" [class.opacity-60]="orders.isLoading()">
              @for (o of rows()?.items ?? []; track o.id) {
                <tr class="cursor-pointer transition hover:bg-white/[0.03]" (click)="selectedId.set(o.id)">
                  <td class="px-5 py-3.5 font-mono text-xs text-slate-400">{{ o.orderNumber }}</td>
                  <td class="px-5 py-3.5 font-medium text-white">{{ o.customerName }}</td>
                  <td class="hidden px-5 py-3.5 text-slate-400 md:table-cell">{{ o.region }}</td>
                  <td class="px-5 py-3.5 text-slate-300">{{ shortDate(o.orderDate) }}</td>
                  <td class="px-5 py-3.5"><app-status-badge [status]="o.status" /></td>
                  <td class="px-5 py-3.5 text-right font-semibold tabular-nums text-white">{{ money(o.total) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-5 py-16 text-center text-slate-500">
                  {{ rows() ? 'No orders match your filters.' : 'Loading orders…' }}
                </td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-white/5 px-5 py-3 text-sm text-slate-400">
          <span>Page {{ page() }} of {{ pages() }}</span>
          <div class="flex gap-2">
            <button type="button" class="btn" [disabled]="page() <= 1" (click)="page.set(page() - 1)">
              <app-icon name="chevronLeft" class="size-4" /> Prev
            </button>
            <button type="button" class="btn" [disabled]="page() >= pages()" (click)="page.set(page() + 1)">
              Next <app-icon name="chevronRight" class="size-4" />
            </button>
          </div>
        </div>
      </div>
    }

    @if (selectedId() !== null) {
      <div class="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in" (click)="selectedId.set(null)">
        <aside class="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-ink-900/95 p-6 shadow-2xl animate-slide-in"
          (click)="$event.stopPropagation()" aria-label="Order details">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs font-medium uppercase tracking-wider text-slate-500">Order</p>
              <h2 class="mt-1 text-xl font-semibold text-white">{{ detail.hasValue() ? detail.value()!.orderNumber : '…' }}</h2>
            </div>
            <button type="button" class="btn size-9 justify-center p-0" (click)="selectedId.set(null)" aria-label="Close">
              <app-icon name="close" class="size-4" />
            </button>
          </div>

          @if (detail.hasValue() && detail.value(); as d) {
            <div class="glass mt-6 p-4">
              <div class="font-medium text-white">{{ d.customerName }}</div>
              <div class="text-sm text-slate-400">{{ d.company }} · {{ d.customerEmail }}</div>
              <div class="mt-1 text-xs text-slate-500">Placed {{ shortDate(d.orderDate) }}</div>
            </div>

            <label class="mt-5 block text-xs font-medium uppercase tracking-wider text-slate-500" for="status">Status</label>
            <select id="status" class="input mt-2 w-full" [value]="d.status" [disabled]="saving()"
              (change)="changeStatus(d.id, $any($event.target).value)">
              @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
            </select>

            <ul class="mt-6 divide-y divide-white/5">
              @for (l of d.lines; track l.sku) {
                <li class="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div class="font-medium text-white">{{ l.product }}</div>
                    <div class="text-xs text-slate-500">{{ l.sku }} · {{ l.quantity }} × {{ money(l.unitPrice) }}</div>
                  </div>
                  <span class="tabular-nums text-slate-200">{{ money(l.lineTotal) }}</span>
                </li>
              }
            </ul>
            <div class="mt-2 flex justify-between border-t border-white/10 pt-4">
              <span class="text-slate-400">Total</span>
              <span class="text-lg font-semibold text-white">{{ money(d.total) }}</span>
            </div>
          } @else {
            <div class="skeleton mt-6 h-64"></div>
          }
        </aside>
      </div>
    }
  `,
})
export class Orders {
  private readonly api = inject(ApiService);
  protected readonly money = money;
  protected readonly shortDate = shortDate;
  protected readonly statuses = ORDER_STATUSES;
  protected readonly statusTabs: ('' | OrderStatus)[] = ['', ...ORDER_STATUSES];

  protected readonly search = signal('');
  protected readonly status = signal<'' | OrderStatus>('');
  protected readonly sortBy = signal<SortKey>('date');
  protected readonly desc = signal(true);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly saving = signal(false);

  private readonly debouncedSearch = toSignal(toObservable(this.search).pipe(debounceTime(300)), { initialValue: '' });

  /** Resets to page 1 whenever the filters change. */
  protected readonly page = linkedSignal({
    source: () => [this.debouncedSearch(), this.status()],
    computation: () => 1,
  });

  protected readonly orders = httpResource<Paged<OrderListItem>>(() => ({
    url: '/api/orders',
    params: {
      search: this.debouncedSearch(), status: this.status(), sortBy: this.sortBy(),
      desc: this.desc(), page: this.page(), pageSize: PAGE_SIZE,
    },
  }));

  /** Keeps the previous page visible while the next one loads. */
  protected readonly rows = linkedSignal<Paged<OrderListItem> | undefined, Paged<OrderListItem> | undefined>({
    source: () => (this.orders.hasValue() ? this.orders.value() : undefined),
    computation: (next, prev) => next ?? prev?.value,
  });

  protected readonly pages = computed(() => Math.max(1, Math.ceil((this.rows()?.total ?? 0) / PAGE_SIZE)));

  protected readonly detail = httpResource<OrderDetail>(() => {
    const id = this.selectedId();
    return id === null ? undefined : `/api/orders/${id}`;
  });

  protected sort(key: SortKey) {
    if (this.sortBy() === key) this.desc.update((d) => !d);
    else { this.sortBy.set(key); this.desc.set(true); }
  }

  protected changeStatus(id: number, status: OrderStatus) {
    this.saving.set(true);
    this.api.updateOrderStatus(id, status).subscribe({
      next: () => { this.detail.reload(); this.orders.reload(); },
      complete: () => this.saving.set(false),
      error: () => this.saving.set(false),
    });
  }
}
