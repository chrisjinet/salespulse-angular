import { initials, money } from './format';
import { stockLevel } from '../pages/products';
import type { Product } from './api';

describe('format helpers', () => {
  it('formats standard and compact currency', () => {
    expect(money(1234.5)).toBe('$1,234.50');
    expect(money(1_250_000, true)).toBe('$1.3M');
  });

  it('builds two-letter initials', () => {
    expect(initials('ava chen')).toBe('AC');
    expect(initials('Mary Jane Watson')).toBe('MJ');
  });
});

describe('stockLevel', () => {
  const product = (stock: number): Product => ({
    id: 1, name: 'Mouse', sku: 'SP-1', category: 'Accessories', price: 10, stock, reorderLevel: 25, unitsSold30d: 0,
  });

  it('classifies stock against the reorder level', () => {
    expect(stockLevel(product(0))).toBe('out');
    expect(stockLevel(product(25))).toBe('low');
    expect(stockLevel(product(26))).toBe('ok');
  });
});
