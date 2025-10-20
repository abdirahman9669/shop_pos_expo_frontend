// src/api/dashboard/owner.ts
import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';

const BASE = `${API_BASE}/api/dashboard/owner`;

type Grain = 'day' | 'week' | 'month';
type FetchOpts = { signal?: AbortSignal; from?: string; to?: string; limit?: number; granularity?: Grain };

type TopProduct = {
  product_id: string;
  total_revenue: number;
  total_qty: number;
  Product: { id: string; name: string; sku: string };
};

type TimeseriesPoint = { date: string; sales_usd: number; tx: number };

type SummaryResponse = {
  ok: true;
  kpis: any; // refine later if you want – structure is stable from your backend
  top_products: TopProduct[];
  alerts: {
    low_stock: any[];
    expiries: any[];
    receivables: any[];
    slow_movers: any[];
    returns_voids: any[];
  };
};

async function authHeaders() {
  const auth = await loadAuth(); // { token, user, shop, ... } or null
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function get<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...(opts || {}), headers: await authHeaders(), method: 'GET' });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error */ }

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json ?? {}) as T;
}

/* -------------------------------- Endpoints ------------------------------- */

export async function fetchSummary(params?: { within_days?: number; lookback_days?: number; top_limit?: number }) {
  const q = new URLSearchParams();
  if (params?.within_days)  q.set('within_days', String(params.within_days));
  if (params?.lookback_days) q.set('lookback_days', String(params.lookback_days));
  if (params?.top_limit)    q.set('top_limit', String(params.top_limit));

  return get<SummaryResponse>(`${BASE}/summary${q.toString() ? `?${q.toString()}` : ''}`);
}

export async function fetchTimeseriesSales({ from, to, granularity = 'day', signal }: FetchOpts) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to)   q.set('to', to);
  q.set('granularity', granularity);

  return get<{ ok: true; series: TimeseriesPoint[] }>(`${BASE}/timeseries/sales?${q.toString()}`, { signal });
}

export async function fetchTopProducts({ from, to, limit = 5, signal }: FetchOpts) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to)   q.set('to', to);
  q.set('limit', String(limit));

  return get<{ ok: true; items: TopProduct[] }>(`${BASE}/top-products?${q.toString()}`, { signal });
}

export async function fetchAlerts(
  kind: 'low-stock' | 'expiries' | 'receivables' | 'slow-movers' | 'returns-voids',
  params?: Record<string, string | number>,
) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => q.set(k, String(v)));
  return get<{ ok: true; items: any[] }>(`${BASE}/alerts/${kind}${q.toString() ? `?${q.toString()}` : ''}`);
}