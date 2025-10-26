import { useCallback, useRef, useState } from 'react';
import {   Line } from '../lib/types';
import { usdCeil2, n } from '../lib/math';
import { pickFEFOLot } from '../lib/fefo';
import { api, Lot, Product } from '../lib/api';

export function useSaleCart() {
  const [lines, setLines] = useState<Line[]>([]);
  const lotsCacheRef = useRef<Map<string, Lot[]>>(new Map());

  const loadLotsForProduct = useCallback(async (productId: string, bustCache = false): Promise<Lot[]> => {
    if (!bustCache && lotsCacheRef.current.has(productId)) return lotsCacheRef.current.get(productId)!;
    try {
      const lots = await api.getLots(productId);
      lotsCacheRef.current.set(productId, lots);
      return lots;
    } catch { return []; }
  }, []);

  const addLineAndGetNewQty = useCallback(async (p: Product): Promise<number> => {
    const lots = await loadLotsForProduct(p.id);
    const fefo = pickFEFOLot(lots);
    let newQty = 1;

    setLines(prev => {
      const idx = prev.findIndex(l => l.product_id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        const q = Math.max(1, (copy[idx].qty || 0) + 1);
        copy[idx] = { ...copy[idx], qty: q };
        newQty = q;
        return copy;
      }
      const price = usdCeil2(typeof p.price_usd === 'string' ? n(p.price_usd, 0) : n(p.price_usd, 0));
      newQty = 1;
      return [...prev, {
        product_id: p.id,
        name: p.name || p.sku,
        qty: 1,
        unit_price_usd: price,
        batch_id: fefo?.batch_id ?? null,
        store_id: fefo?.store_id ?? null,
        expiry_date: fefo?.expiry_date ?? null,
        lot_summary: fefo
          ? `${fefo.store_name} • ${fefo.batch_number}${fefo.expiry_date ? ` • exp ${fefo.expiry_date}` : ''} • ${fefo.on_hand}`
          : 'No lot selected',
      }];
    });

    return newQty;
  }, [loadLotsForProduct]);

  const setQty = (id: string, v: string) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, qty: Math.max(1, Math.floor(Number(v || '1'))) } : l));

  const setPrice = (id: string, v: string) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, unit_price_usd: usdCeil2(v) } : l));

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.product_id !== id));

  const clearLines = () => { setLines([]); lotsCacheRef.current.clear(); };

  return {
    lines,
    setLines,
    addLineAndGetNewQty,
    setQty,
    setPrice,
    removeLine,
    loadLotsForProduct,
    lotsCacheRef,
    clearLines,
  };
}
