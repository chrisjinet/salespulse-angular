import { Component, computed, input, model } from '@angular/core';
import { NgClass } from '@angular/common';
import type { OrderStatus } from '../core/api';

const ICONS: Record<string, string> = {
  grid: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  receipt: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
  cube: 'm21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
  users: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
  close: 'M6 18 18 6M6 6l12 12',
  menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  up: 'M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18',
  down: 'M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3',
  chevronLeft: 'M15.75 19.5 8.25 12l7.5-7.5',
  chevronRight: 'm8.25 4.5 7.5 7.5-7.5 7.5',
  sort: 'M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5',
};

@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" class="size-full"><path [attr.d]="path()" /></svg>`,
  host: { class: 'inline-block shrink-0' },
})
export class Icon {
  readonly name = input.required<string>();
  protected readonly path = computed(() => ICONS[this.name()] ?? '');
}

@Component({
  selector: 'app-delta',
  imports: [Icon],
  template: `
    <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      [class]="up() ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'">
      <app-icon [name]="up() ? 'up' : 'down'" class="size-3" />{{ abs() }}%
    </span>`,
})
export class Delta {
  readonly value = input.required<number>();
  protected readonly up = computed(() => this.value() >= 0);
  protected readonly abs = computed(() => Math.abs(this.value()));
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  Processing: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
  Shipped: 'bg-violet-400/10 text-violet-300 ring-violet-400/20',
  Delivered: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  Cancelled: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
};

@Component({
  selector: 'app-status-badge',
  imports: [NgClass],
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset" [ngClass]="style()">
      <span class="size-1.5 rounded-full bg-current"></span>{{ status() }}
    </span>`,
})
export class StatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly style = computed(() => STATUS_STYLES[this.status()]);
}

export interface SegmentOption<T> { value: T; label: string }

@Component({
  selector: 'app-segmented',
  template: `
    <div role="tablist" class="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
      @for (o of options(); track o.value) {
        <button role="tab" type="button" [attr.aria-selected]="o.value === value()" (click)="value.set(o.value)"
          class="rounded-lg px-3.5 py-1.5 text-sm font-medium transition"
          [class]="o.value === value()
            ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30'
            : 'text-slate-400 hover:text-white'">{{ o.label }}</button>
      }
    </div>`,
})
export class Segmented<T> {
  readonly options = input.required<SegmentOption<T>[]>();
  readonly value = model.required<T>();
}

@Component({
  selector: 'app-error',
  template: `
    <div class="glass border-rose-400/20 p-6 text-sm text-rose-300">
      Could not load data. Is the API running on port 5080?
    </div>`,
})
export class ErrorState {}
