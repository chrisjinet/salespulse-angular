import { Component, computed, input } from '@angular/core';
import { EChart, type ChartOption } from './echart';
import { Delta } from './ui';

@Component({
  selector: 'app-kpi-card',
  host: { class: 'block' },
  imports: [Delta, EChart],
  template: `
    <div class="glass group relative h-full overflow-hidden p-5 transition hover:border-white/15">
      <div class="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-3xl transition group-hover:opacity-40"
        [style.background]="color()"></div>
      <div class="flex items-center justify-between">
        <span class="text-sm text-slate-400">{{ label() }}</span>
        <app-delta [value]="change()" />
      </div>
      <div class="mt-3 text-3xl font-semibold tracking-tight text-white">{{ value() }}</div>
      <div class="mt-1 text-xs text-slate-500">vs previous period</div>
      @if (spark().length) {
        <div class="-mx-1 mt-3 h-12" [echart]="sparkOption()"></div>
      }
    </div>`,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly change = input(0);
  readonly spark = input<number[]>([]);
  readonly color = input('#818cf8');

  protected readonly sparkOption = computed<ChartOption>(() => ({
    grid: { left: 0, right: 0, top: 4, bottom: 0 },
    xAxis: { type: 'category', show: false, boundaryGap: false },
    yAxis: { type: 'value', show: false, min: 'dataMin' },
    series: [{
      type: 'line', data: this.spark(), smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: this.color() },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: this.color() + '55' }, { offset: 1, color: this.color() + '00' }] } },
    }],
  }));
}
