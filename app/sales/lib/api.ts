// app/sale/lib/api.ts
import { API_BASE, TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

export type Store = { id: string; name: string };
export type Product = { id: string; sku: string; name: string; unit?: string; price_usd?: string | number };
export type Lot = {
  batch_id: string;
  batch_number: string;
  expiry_date: string | null;
  store_id: string;
  product_id?: string;
  store_name: string;
  on_hand: number;
};

export const api = {
  // Products
  async getProducts(q: string) {
    const qs = new URLSearchParams({ q, limit: '25' });
    const r = await fetch(`${API_BASE}/api/products?${qs.toString()}`, { headers: AUTH });
    const j = await r.json();
    return Array.isArray(j) ? j : (j.data ?? []);
  },
  async getProductByBarcode(barcode: string) {
    const r = await fetch(`${API_BASE}/api/products/byBar?barcode=${encodeURIComponent(barcode)}`, { headers: AUTH });
    if (r.status === 404) return null;
    const j = await r.json();
    const p = (j && (j.id && j.sku)) ? j
      : (j?.product?.id ? j.product
      : (Array.isArray(j?.data) ? j.data[0]
      : (j?.data?.id ? j.data : null)));
    return p ?? null;
  },

  // Lots
  async getLots(productId: string) {
    const r = await fetch(`${API_BASE}/api/batches/product/${productId}`, { headers: AUTH });
    const j = await r.json();
    const lots: Lot[] = (j?.lots ?? []).map((x: any) => ({
      batch_id: x.batch_id,
      batch_number: x.batch_number,
      expiry_date: x.expiry_date ?? null,
      store_id: x.store_id,
      store_name: x.store_name,
      on_hand: Number(x.on_hand || 0),
    }));
    return lots;
  },

  // Transfer
  async postTransfer(payload: { product_id: string; batch_id: string; from_store_id: string; to_store_id: string; qty: number; }) {
    const r = await fetch(`${API_BASE}/api/stock-transfers`, { method: 'POST', headers: AUTH, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  },

  // Stores
  async getStores(): Promise<Store[]> {
    const r = await fetch(`${API_BASE}/api/stores?limit=200`, { headers: AUTH });
    const j = await r.json();
    return (j?.data ?? j ?? []).map((s: any) => ({ id: s.id, name: s.name }));
  },

  // Sales
  async postSale(body: any) {
    const r = await fetch(`${API_BASE}/api/sales`, { method: 'POST', headers: AUTH, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
    return j;
  },

  // Devices & sessions
  async getDevices() {
    const r = await fetch(`${API_BASE}/api/devices`, { headers: AUTH });
    const j = await r.json();
    return (j?.data ?? j ?? []).map((x: any) => ({ id: x.id, label: x.label, name: x.name }));
  },
  async getOpenSessions() {
    const r = await fetch(`${API_BASE}/api/cash-sessions`, { headers: AUTH });
    const j = await r.json();
    return (j?.data ?? j ?? []).filter((x: any) => !x.closed_at);
  },

  // Customers
  async getCustomers(q: string) {
    const params = new URLSearchParams({ limit: '10', ...(q ? { q } : {}) });
    const r = await fetch(`${API_BASE}/api/customers?${params.toString()}`, { headers: AUTH });
    const j = await r.json();
    return (j?.data ?? j ?? []);
  },

  // Rates
  async getLatestRate() {
    const r = await fetch(`${API_BASE}/api/exchange-rates?limit=1&order=as_of_date&dir=DESC`, { headers: AUTH });
    const j = await r.json();
    const row = (j?.data ?? [])[0];
    // If there's no row or no positive accounting rate, treat as "no rate"
    if (!row || !Number.isFinite(Number(row.rate_accounting)) || Number(row.rate_accounting) <= 0) {
    throw new Error('NO_EXCHANGE_RATE');
    }

    return {
      accounting: Number(row.rate_accounting ),
      sell: Number(row.rate_sell_usd_to_sos ),
      buy: Number(row.rate_buy_usd_with_sos ),
    };
  },
};