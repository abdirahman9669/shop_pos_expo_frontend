// src/hooks/useOwnerDashboard.ts
import * as React from 'react';
import { fetchSummary, fetchTimeseriesSales, fetchTopProducts } from '@/src/api/dashboard/owner';

export type Grain = 'day' | 'week' | 'month';

export function toISODate(date: Date) {
  // normalize to day start in local tz before shipping to server
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useOwnerDashboard(
  initialRange?: { from: Date; to: Date },
  initialGrain: Grain = 'day'
) {
  // ✅ lazy init removes any need to “seed” via effects
  const [from, setFrom] = React.useState<Date>(() => initialRange?.from ?? new Date(Date.now() - 6 * 864e5));
  const [to, setTo]     = React.useState<Date>(() => initialRange?.to   ?? new Date());
  const [grain, setGrain] = React.useState<Grain>(initialGrain);

  const [summary, setSummary]   = React.useState<Awaited<ReturnType<typeof fetchSummary>> | null>(null);
  const [series, setSeries]     = React.useState<{ date: string; sales_usd: number; tx: number }[]>([]);
  const [top, setTop]           = React.useState<Awaited<ReturnType<typeof fetchTopProducts>>['items']>([]);
  const [loading, setLoading]   = React.useState(true);
  const [error, setError]       = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  // ✅ use primitive numbers (timestamps) as deps to avoid object identity churn
  const fromMs = from.getTime();
  const toMs   = to.getTime();

  // manual trigger (e.g., pull-to-refresh)
  const [tick, setTick] = React.useState(0);
  const reload = React.useCallback(() => setTick(x => x + 1), []);

  React.useEffect(() => {
    // guard invalid ranges (prevents flip-flop updates)
    if (fromMs > toMs) return;

    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // build once per run from the primitive deps
    const fromISO = toISODate(new Date(fromMs));
    const toISO   = toISODate(new Date(toMs));

    (async () => {
      try {
        const [sumRes, tsRes, topRes] = await Promise.all([
          // if your API supports AbortController, add { signal: ac.signal }
          fetchSummary({ within_days: 90, lookback_days: 30, top_limit: 5 }),
          fetchTimeseriesSales({ from: fromISO, to: toISO, granularity: grain, signal: ac.signal }),
          fetchTopProducts({ from: fromISO, to: toISO, limit: 5, signal: ac.signal }),
        ]);

        setSummary(sumRes);
        setSeries(tsRes?.series || []);
        setTop(topRes?.items || []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [fromMs, toMs, grain, tick]); // ✅ stable, primitive deps only

  return {
    // state
    from, to, grain, setFrom, setTo, setGrain,
    loading, error,
    // data
    summary,
    kpis: summary?.kpis ?? null,
    topProducts: top,
    alerts: summary?.alerts ?? { low_stock: [], expiries: [], receivables: [], slow_movers: [], returns_voids: [] },
    series,
    // actions
    reload,
  };
}