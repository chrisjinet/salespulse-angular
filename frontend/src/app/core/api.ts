import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export interface KpiSummary {
  revenue: number; revenueChange: number;
  orders: number; ordersChange: number;
  avgOrderValue: number; avgOrderValueChange: number;
  activeCustomers: number; activeCustomersChange: number;
}
export interface TrendPoint { period: string; revenue: number; orders: number }
export interface LabelValue { label: string; value: number }
export interface TopProduct { id: number; name: string; category: string; unitsSold: number; revenue: number }
export interface OrderListItem {
  id: number; orderNumber: string; customerName: string; region: string;
  orderDate: string; status: OrderStatus; itemCount: number; total: number;
}
export interface OrderLine { product: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }
export interface OrderDetail {
  id: number; orderNumber: string; customerName: string; customerEmail: string; company: string;
  orderDate: string; status: OrderStatus; total: number; lines: OrderLine[];
}
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number }
export interface Product {
  id: number; name: string; sku: string; category: string; price: number;
  stock: number; reorderLevel: number; unitsSold30d: number;
}
export interface Customer {
  id: number; name: string; email: string; company: string; region: string;
  orderCount: number; lifetimeValue: number; lastOrder: string | null;
}

/** Write operations. Reads are declared in components with httpResource so they react to signal inputs. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  updateOrderStatus(id: number, status: OrderStatus) {
    return this.http.patch<void>(`/api/orders/${id}/status`, { status });
  }

  updateStock(id: number, stock: number) {
    return this.http.put<void>(`/api/products/${id}/stock`, { stock });
  }
}
