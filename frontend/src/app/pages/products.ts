import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ApiService, type Product } from '../core/api';
import { money } from '../core/format';
import { ErrorState, Segmented, type SegmentOption } from '../shared/ui';

type Level = 'ok' | 'low' | 'out';
type Filter = 'all' | 'low' | 'out';

const LEVEL_STYLES: Record<Level, { label: string; badge: string; bar: string }> = {
  ok: { label: 'In stock', badge: 'bg-emerald-400/10 text-emerald-300', bar: 'from-emerald-400 to-teal-400' },
  low: { label: 'Low stock', badge: 'bg-amber-400/10 text-amber-300', bar: 'from-amber-300 to-orange-500' },
  out: { label: 'Out of stock', badge: 'bg-rose-400/10 text-rose-300', bar: 'from-rose-400 to-rose-600' },
};

export const stockLevel = (p: Product): Level =>
  p.stock === 0 ? 'out' : p.stock <= p.reorderLevel ? 'low' : 'ok';

@Component({
  selector: 'app-products',
  imports: [Segmented, ErrorState],
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <p class="text-sm font-medium text-indigo-300">Catalog</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight text-white">Inventory</h1>
        <p class="mt-1 text-sm text-slate-400">
          {{ all().length }} SKUs · {{ counts().low }} low stock · {{ counts().out }} out of stock
        </p>
      </div>
      <app-segmented [options]="filters()" [(value)]="filter" />
    </header>

    <div class="mt-6 flex flex-wrap gap-2">
      @for (c of categoryTabs(); track c) {
        <button type="button" (click)="category.set(c)"
          class="rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset transition"
          [class]="category() === c ? 'bg-white text-ink-950 ring-white font-medium' : 'text-slate-400 ring-white/10 hover:text-white'">
          {{ c || 'All categories' }}
        </button>
      }
    </div>

    @if (products.error()) {
      <div class="mt-6"><app-error /></div>
    } @else if (!products.hasValue()) {
      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) { <div class="skeleton h-56"></div> }
      </div>
    } @else {
      <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (p of rows(); track p.id) {
          @let style = levels[level(p)];
          <article class="glass flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-white/15">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500">{{ p.category }}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" [class]="style.badge">{{ style.label }}</span>
            </div>
            <h3 class="mt-2 font-semibold text-white">{{ p.name }}</h3>
            <span class="font-mono text-xs text-slate-500">{{ p.sku }}</span>

            <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div><dt class="text-xs text-slate-500">Price</dt><dd class="font-semibold text-white">{{ money(p.price) }}</dd></div>
              <div><dt class="text-xs text-slate-500">Sold (30d)</dt><dd class="font-semibold text-white">{{ p.unitsSold30d }}</dd></div>
            </dl>

            <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div class="h-full rounded-full bg-gradient-to-r" [class]="style.bar" [style.width.%]="meter(p)"></div>
            </div>

            <div class="mt-auto pt-4">
              @if (editingId() === p.id) {
                <div class="flex gap-2">
                  <input type="number" min="0" class="input h-9 w-20" aria-label="Units on hand"
                    [value]="draft()" (input)="draft.set(+$any($event.target).value)" />
                  <button type="button" class="btn-primary" [disabled]="saving() || draft() < 0" (click)="save(p.id)">Save</button>
                  <button type="button" class="btn" (click)="editingId.set(null)">Cancel</button>
                </div>
              } @else {
                <div class="flex items-center justify-between">
                  <span class="text-sm"><span class="font-semibold text-white">{{ p.stock }}</span> <span class="ml-1 text-slate-500">on hand</span></span>
                  <button type="button" class="btn h-8" (click)="edit(p)">Adjust</button>
                </div>
              }
            </div>
          </article>
        } @empty {
          <p class="col-span-full py-16 text-center text-slate-500">No products match this filter.</p>
        }
      </div>
    }
  `,
})
export class Products {
  private readonly api = inject(ApiService);
  protected readonly money = money;
  protected readonly levels = LEVEL_STYLES;
  protected readonly level = stockLevel;

  protected readonly products = httpResource<Product[]>(() => '/api/products');
  protected readonly filter = signal<Filter>('all');
  protected readonly category = signal('');
  protected readonly editingId = signal<number | null>(null);
  protected readonly draft = signal(0);
  protected readonly saving = signal(false);

  protected readonly all = computed(() => (this.products.hasValue() ? this.products.value() : []));
  protected readonly categoryTabs = computed(() => ['', ...new Set(this.all().map((p) => p.category))]);
  protected readonly counts = computed(() => ({
    low: this.all().filter((p) => stockLevel(p) === 'low').length,
    out: this.all().filter((p) => stockLevel(p) === 'out').length,
  }));
  protected readonly filters = computed<SegmentOption<Filter>[]>(() => [
    { value: 'all', label: 'All' },
    { value: 'low', label: `Low (${this.counts().low})` },
    { value: 'out', label: `Out (${this.counts().out})` },
  ]);
  protected readonly rows = computed(() =>
    this.all().filter((p) =>
      (!this.category() || p.category === this.category()) &&
      (this.filter() === 'all' || stockLevel(p) === this.filter())));

  protected meter(p: Product) {
    return Math.min(100, (p.stock / 250) * 100);
  }

  protected edit(p: Product) {
    this.draft.set(p.stock);
    this.editingId.set(p.id);
  }

  protected save(id: number) {
    this.saving.set(true);
    this.api.updateStock(id, this.draft()).subscribe({
      next: () => { this.editingId.set(null); this.products.reload(); },
      complete: () => this.saving.set(false),
      error: () => this.saving.set(false),
    });
  }
}
