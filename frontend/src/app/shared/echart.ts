import { Directive, ElementRef, OnDestroy, afterNextRender, effect, inject, input } from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, SVGRenderer]);

export type ChartOption = echarts.EChartsCoreOption;

/** Shared dark-theme tooltip styling. */
export const tooltipStyle = {
  backgroundColor: 'rgba(12,14,26,0.92)',
  borderColor: 'rgba(255,255,255,0.08)',
  textStyle: { color: '#e2e8f0', fontSize: 12 },
  extraCssText: 'backdrop-filter: blur(8px); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.4);',
};

/** Minimal ECharts binding: `<div [echart]="options"></div>`. Resizes with its container. */
@Directive({ selector: '[echart]' })
export class EChart implements OnDestroy {
  readonly echart = input.required<ChartOption>();

  private readonly el = inject(ElementRef<HTMLElement>);
  private chart?: echarts.ECharts;
  private observer?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.chart = echarts.init(this.el.nativeElement, null, { renderer: 'svg' });
      this.chart.setOption(this.echart());
      this.observer = new ResizeObserver(() => this.chart?.resize());
      this.observer.observe(this.el.nativeElement);
    });

    effect(() => {
      const option = this.echart();
      this.chart?.setOption(option, { notMerge: true });
    });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.chart?.dispose();
  }
}
