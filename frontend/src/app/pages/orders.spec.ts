import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { OrderDetail, OrderListItem, Paged } from '../core/api';
import { Orders } from './orders';

const row: OrderListItem = {
  id: 1, orderNumber: 'ORD-100001', customerName: 'Ava Chen', region: 'Europe',
  orderDate: '2026-10-01T10:00:00', status: 'Pending', itemCount: 2, total: 250,
};
const page = (items: OrderListItem[], total = items.length): Paged<OrderListItem> =>
  ({ items, total, page: 1, pageSize: 12 });
const detail: OrderDetail = {
  id: 1, orderNumber: 'ORD-100001', customerName: 'Ava Chen', customerEmail: 'ava@example.com',
  company: 'Hooli', orderDate: '2026-10-01T10:00:00', status: 'Pending', total: 250,
  lines: [{ product: 'Wireless Mouse', sku: 'SP-1009', quantity: 2, unitPrice: 125, lineTotal: 250 }],
};

describe('Orders page', () => {
  let fixture: ComponentFixture<Orders>;
  let http: HttpTestingController;
  let el: HTMLElement;

  /** Runs change detection so signal-driven requests are sent (whenStable would wait on them). */
  const tick = () => TestBed.tick();
  /** Waits for rendering once all requests have been answered. */
  const settle = async () => { await fixture.whenStable(); fixture.detectChanges(); };
  const expectList = () => http.expectOne((r) => r.url === '/api/orders');

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Orders);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('requests the first page sorted by newest and renders rows', async () => {
    const req = expectList();
    expect(req.request.params.get('sortBy')).toBe('date');
    expect(req.request.params.get('desc')).toBe('true');
    expect(req.request.params.get('page')).toBe('1');

    req.flush(page([row], 30));
    await settle();

    expect(el.textContent).toContain('ORD-100001');
    expect(el.textContent).toContain('30 orders');
    expect(el.textContent).toContain('Page 1 of 3');
  });

  it('toggles sort direction when the same column is clicked twice', async () => {
    expectList().flush(page([row]));
    await settle();

    const totalHeader = Array.from(el.querySelectorAll<HTMLButtonElement>('th button')).find((b) => b.textContent?.includes('Total'))!;
    totalHeader.click();
    tick();
    let req = expectList();
    expect(req.request.params.get('sortBy')).toBe('total');
    expect(req.request.params.get('desc')).toBe('true');
    req.flush(page([row]));
    await settle();

    totalHeader.click();
    tick();
    req = expectList();
    expect(req.request.params.get('desc')).toBe('false');
    req.flush(page([row]));
  });

  it('filters by status from the pill tabs', async () => {
    expectList().flush(page([row]));
    await settle();

    const shipped = Array.from(el.querySelectorAll<HTMLButtonElement>('[role=tab]')).find((b) => b.textContent?.trim() === 'Shipped')!;
    shipped.click();
    tick();

    const req = expectList();
    expect(req.request.params.get('status')).toBe('Shipped');
    req.flush(page([]));
    await settle();
    expect(el.textContent).toContain('No orders match your filters.');
  });

  it('opens the drawer, loads details and updates the status', async () => {
    expectList().flush(page([row]));
    await settle();

    el.querySelector<HTMLTableRowElement>('tbody tr')!.click();
    tick();
    http.expectOne('/api/orders/1').flush(detail);
    await settle();

    expect(el.textContent).toContain('Wireless Mouse');
    expect(el.textContent).toContain('ava@example.com');

    const select = el.querySelector<HTMLSelectElement>('#status')!;
    select.value = 'Delivered';
    select.dispatchEvent(new Event('change'));

    const patch = http.expectOne('/api/orders/1/status');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'Delivered' });
    patch.flush(null);
    tick();

    // Both the drawer and the list refresh after a successful update.
    http.expectOne('/api/orders/1').flush({ ...detail, status: 'Delivered' });
    expectList().flush(page([{ ...row, status: 'Delivered' }]));
    await settle();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(el.textContent).not.toContain('Wireless Mouse');
  });
});
