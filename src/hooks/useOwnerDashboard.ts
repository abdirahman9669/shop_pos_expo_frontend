// src/hooks/useOwnerDashboard.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchSummary, fetchTimeseriesSales, fetchTopProducts } from '@/src/api/dashboard/owner';

export type Grain = 'day'|'week'|'month';

export function toISODate(date: Date) {
  // keep day boundary (yyyy-mm-dd) – server already buckets by date_trunc
  const d = new Date(date); d.setHours(0,0,0,0);
  return d.toISOString();
}

export function useOwnerDashboard(initialRange?: { from: Date; to: Date }, initialGrain: Grain = 'day') {
  const [from, setFrom] = useState<Date>(initialRange?.from ?? new Date(Date.now() - 6*24*3600*1000));
  const [to, setTo] = useState<Date>(initialRange?.to ?? new Date());
  const [grain, setGrain] = useState<Grain>(initialGrain);

  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchSummary>> | null>(null);
  const [series, setSeries] = useState<{ date: string; sales_usd: number; tx: number }[]>([]);
  const [top, setTop] = useState<Awaited<ReturnType<typeof fetchTopProducts>>['items']>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string| null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const iso = useMemo(() => ({ from: toISODate(from), to: toISODate(to) }), [from, to]);

  useEffect(() => {
    setLoading(true); setError(null);
    abortRef.current?.abort();
    const ac = new AbortController(); abortRef.current = ac;

    Promise.all([
      fetchSummary({ within_days: 90, lookback_days: 30, top_limit: 5 }),
      fetchTimeseriesSales({ from: iso.from, to: iso.to, granularity: grain, signal: ac.signal }),
      fetchTopProducts({ from: iso.from, to: iso.to, limit: 5, signal: ac.signal }),
    ])
      .then(([sumRes, tsRes, topRes]) => {
        setSummary(sumRes);
        setSeries(tsRes.series || []);
        setTop(topRes.items || []);
      })
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [iso.from, iso.to, grain]);

  return {
    // state
    from, to, grain, setFrom, setTo, setGrain,
    loading, error,
    // data
    summary,
    kpis: summary?.kpis || null,
    topProducts: top,
    alerts: summary?.alerts || { low_stock: [], expiries: [], receivables: [], slow_movers: [], returns_voids: [] },
    series,
  };
}
