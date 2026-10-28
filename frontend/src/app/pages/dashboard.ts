import { Component, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { KpiSummary, LabelValue, OrderListItem, Paged, TopProduct, TrendPoint } from '../core/api';
import { money, shortDate } from '../core/format';
import { EChart, tooltipStyle, type ChartOption } from '../shared/echart';
import { ErrorState, Segmented, StatusBadge, type SegmentOption } from '../shared/ui';
import { KpiCard } from '../shared/kpi-card';

const PALETTE = ['#818cf8', '#a78bfa', '#e879f9', '#38bdf8', '#34d399', '#fbbf24'];
const axisLabel = { color: '#64748b', fontSize: 11 };
const splitLine = { lineStyle: { color: 'rgba(255,255,255,0.05)' } };

@Component({
  selector: 'app-dashboard',
  imports: [KpiCard, Segmented, StatusBadge, EChart, ErrorState],
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <p class="text-sm font-medium text-indigo-300">Overview</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight text-white">Sales performance</h1>
        <p class="mt-1 text-sm text-slate-400">Revenue, orders and customer activity across all regions.</p>
      </div>
      <app-segmented [options]="ranges" [(value)]="days" />
    </header>

    @if (summary.error()) {
      <div class="mt-8"><app-error /></div>
    } @else {
      <!-- KPIs -->
      <section class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @if (kpis(); as k) {
          @for (card of k; track card.label) {
            <app-kpi-card class="animate-fade-in"
              [label]="card.label" [value]="card.value" [change]="card.change" [spark]="card.spark" [color]="card.color" />
          }
        } @else {
          @for (i of [1, 2, 3, 4]; track i) { <div class="skeleton h-[184px]"></div> }
        }
      </section>

      <!-- Trend + category -->
      <section class="mt-4 grid gap-4 xl:grid-cols-3">
        <div class="glass p-5 xl:col-span-2">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-semibold text-white">Revenue & orders</h2>
              <p class="text-xs text-slate-500">{{ days() > 90 ? 'Monthly' : 'Daily' }} totals, cancelled orders excluded</p>
            </div>
            <div class="flex gap-4 text-xs text-slate-400">
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-indigo-400"></span>Revenue</span>
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-fuchsia-400/60"></span>Orders</span>
            </div>
          </div>
          @if (trend.hasValue()) {
            <div class="mt-4 h-80" [echart]="trendOption()"></div>
          } @else { <div class="skeleton mt-4 h-80"></div> }
        </div>

        <div class="glass p-5">
          <h2 class="font-semibold text-white">Sales by category</h2>
          @if (category.hasValue()) {
            <div class="relative mt-2 h-52">
              <div class="absolute inset-0" [echart]="categoryOption()"></div>
              <div class="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div class="text-xs text-slate-500">Total</div>
                  <div class="text-xl font-semibold text-white">{{ money(categoryTotal(), true) }}</div>
                </div>
              </div>
            </div>
            <ul class="mt-3 space-y-2.5">
              @for (c of category.value(); track c.label; let i = $index) {
                <li class="flex items-center gap-3 text-sm">
                  <span class="size-2.5 rounded-sm" [style.background]="palette[i % palette.length]"></span>
                  <span class="text-slate-300">{{ c.label }}</span>
                  <span class="ml-auto tabular-nums text-slate-400">{{ money(c.value, true) }}</span>
                  <span class="w-10 text-right text-xs tabular-nums text-slate-500">{{ pct(c.value, categoryTotal()) }}%</span>
                </li>
              }
            </ul>
          } @else { <div class="skeleton mt-4 h-80"></div> }
        </div>
      </section>

      <!-- Region, top products, recent -->
      <section class="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div class="glass p-5">
          <h2 class="font-semibold text-white">Revenue by region</h2>
          @if (region.hasValue()) {
            <ul class="mt-5 space-y-4">
              @for (r of region.value(); track r.label) {
                <li>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-300">{{ r.label }}</span>
                    <span class="tabular-nums font-medium text-white">{{ money(r.value, true) }}</span>
                  </div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div class="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-[width] duration-700"
                      [style.width.%]="pct(r.value, regionMax())"></div>
                  </div>
                </li>
              }
            </ul>
          } @else { <div class="skeleton mt-4 h-60"></div> }
        </div>

        <div class="glass p-5">
          <h2 class="font-semibold text-white">Top products</h2>
          @if (top.hasValue()) {
            <ol class="mt-4 divide-y divide-white/5">
              @for (p of top.value(); track p.id; let i = $index) {
                <li class="flex items-center gap-3 py-3">
                  <span class="grid size-8 place-items-center rounded-lg text-xs font-bold"
                    [class]="i === 0 ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950' : 'bg-white/5 text-slate-400'">{{ i + 1 }}</span>
                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium text-white">{{ p.name }}</div>
                    <div class="text-xs text-slate-500">{{ p.category }} · {{ p.unitsSold }} units</div>
                  </div>
                  <span class="ml-auto text-sm font-semibold tabular-nums text-white">{{ money(p.revenue, true) }}</span>
                </li>
              }
            </ol>
          } @else { <div class="skeleton mt-4 h-60"></div> }
        </div>

        <div class="glass p-5 lg:col-span-2 xl:col-span-1">
          <h2 class="font-semibold text-white">Latest orders</h2>
          @if (recent.hasValue()) {
            <ul class="mt-4 divide-y divide-white/5">
              @for (o of recent.value().items; track o.id) {
                <li class="flex items-center justify-between gap-3 py-3">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium text-white">{{ o.customerName }}</div>
                    <div class="text-xs text-slate-500">{{ o.orderNumber }} · {{ shortDate(o.orderDate) }}</div>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span class="text-sm font-semibold tabular-nums text-white">{{ money(o.total) }}</span>
                    <app-status-badge [status]="o.status" />
                  </div>
                </li>
              }
            </ul>
          } @else { <div class="skeleton mt-4 h-60"></div> }
        </div>
      </section>
    }
  `,
})
export class Dashboard {
  protected readonly ranges: SegmentOption<number>[] = [
    { value: 7, label: '7D' }, { value: 30, label: '30D' }, { value: 90, label: '90D' }, { value: 365, label: '12M' },
  ];
  protected readonly days = signal(30);
  protected readonly palette = PALETTE;
  protected readonly money = money;
  protected readonly shortDate = shortDate;

  protected readonly summary = httpResource<KpiSummary>(() => `/api/dashboard/summary?days=${this.days()}`);
  protected readonly trend = httpResource<TrendPoint[]>(() => `/api/dashboard/trend?days=${this.days()}`);
  protected readonly category = httpResource<LabelValue[]>(() => `/api/dashboard/by-category?days=${this.days()}`);
  protected readonly region = httpResource<LabelValue[]>(() => `/api/dashboard/by-region?days=${this.days()}`);
  protected readonly top = httpResource<TopProduct[]>(() => `/api/dashboard/top-products?days=${this.days()}`);
  protected readonly recent = httpResource<Paged<OrderListItem>>(() => '/api/orders?pageSize=6');

  protected readonly kpis = computed(() => {
    if (!this.summary.hasValue()) return undefined;
    const s = this.summary.value();
    const t = this.trend.hasValue() ? this.trend.value() : [];
    return [
      { label: 'Revenue', value: money(s.revenue, true), change: s.revenueChange, color: '#818cf8', spark: t.map((p) => p.revenue) },
      { label: 'Orders', value: s.orders.toLocaleString(), change: s.ordersChange, color: '#e879f9', spark: t.map((p) => p.orders) },
      { label: 'Avg. order value', value: money(s.avgOrderValue), change: s.avgOrderValueChange, color: '#38bdf8',
        spark: t.map((p) => (p.orders ? p.revenue / p.orders : 0)) },
      { label: 'Active customers', value: s.activeCustomers.toLocaleString(), change: s.activeCustomersChange, color: '#34d399', spark: [] },
    ];
  });

  protected readonly categoryTotal = computed(() =>
    this.category.hasValue() ? this.category.value().reduce((sum, c) => sum + c.value, 0) : 0);
  protected readonly regionMax = computed(() =>
    this.region.hasValue() ? Math.max(...this.region.value().map((r) => r.value), 1) : 1);

  protected readonly trendOption = computed<ChartOption>(() => {
    const data = this.trend.hasValue() ? this.trend.value() : [];
    const monthly = this.days() > 90;
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString('en-US', monthly ? { month: 'short' } : { month: 'short', day: 'numeric' });
    return {
      grid: { left: 8, right: 8, top: 16, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', ...tooltipStyle,
        valueFormatter: (v: number) => (v > 1000 ? money(v) : String(v)) },
      xAxis: { type: 'category', data: data.map((p) => fmt(p.period)), axisLine: { show: false },
        axisTick: { show: false }, axisLabel },
      yAxis: [
        { type: 'value', splitLine, axisLabel: { ...axisLabel, formatter: (v: number) => money(v, true) } },
        { type: 'value', show: false },
      ],
      series: [
        { name: 'Orders', type: 'bar', yAxisIndex: 1, data: data.map((p) => p.orders), barMaxWidth: 14,
          itemStyle: { color: 'rgba(232,121,249,0.25)', borderRadius: [4, 4, 0, 0] } },
        { name: 'Revenue', type: 'line', data: data.map((p) => p.revenue), smooth: true, symbol: 'circle', symbolSize: 6,
          showSymbol: false, lineStyle: { width: 3, color: '#818cf8', shadowColor: 'rgba(129,140,248,0.6)', shadowBlur: 12 },
          itemStyle: { color: '#818cf8' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(129,140,248,0.35)' }, { offset: 1, color: 'rgba(129,140,248,0)' }] } } },
      ],
    };
  });

  protected readonly categoryOption = computed<ChartOption>(() => ({
    tooltip: { trigger: 'item', ...tooltipStyle, valueFormatter: (v: number) => money(v) },
    series: [{
      type: 'pie', radius: ['68%', '90%'], padAngle: 3, itemStyle: { borderRadius: 6 }, label: { show: false },
      data: (this.category.hasValue() ? this.category.value() : []).map((c, i) => ({
        name: c.label, value: c.value, itemStyle: { color: PALETTE[i % PALETTE.length] },
      })),
    }],
  }));

  protected pct(value: number, total: number) {
    return total ? Math.round((value / total) * 100) : 0;
  }
}
