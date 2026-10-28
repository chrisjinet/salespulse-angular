import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Delta, Segmented, StatusBadge, type SegmentOption } from './ui';

describe('Delta', () => {
  it('renders positive changes in green and negative changes in red without a sign', async () => {
    const fixture = TestBed.createComponent(Delta);
    fixture.componentRef.setInput('value', -4.2);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(el.textContent?.trim()).toBe('4.2%');
    expect(el.className).toContain('text-rose-300');

    fixture.componentRef.setInput('value', 12);
    await fixture.whenStable();
    expect(el.className).toContain('text-emerald-300');
  });
});

describe('StatusBadge', () => {
  it('applies status-specific colors', async () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', 'Delivered');
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(el.textContent?.trim()).toBe('Delivered');
    expect(el.className).toContain('text-emerald-300');
  });
});

@Component({
  imports: [Segmented],
  template: `<app-segmented [options]="options" [(value)]="value" />`,
})
class SegmentedHost {
  options: SegmentOption<number>[] = [{ value: 7, label: '7D' }, { value: 30, label: '30D' }];
  value = signal(30);
}

describe('Segmented', () => {
  it('marks the selected option and two-way binds clicks', async () => {
    const fixture = TestBed.createComponent(SegmentedHost);
    await fixture.whenStable();

    const [week, month]: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    expect(month.getAttribute('aria-selected')).toBe('true');

    week.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe(7);
    expect(week.getAttribute('aria-selected')).toBe('true');
  });
});
