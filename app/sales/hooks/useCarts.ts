import { useState } from 'react';
import { CartId, CartSnapshot } from '../lib/types';

export function useCarts(initialActive: CartId = 'A') {
  const [carts, setCarts] = useState<Record<CartId, CartSnapshot>>({});
  const [activeCartId, setActiveCartId] = useState<CartId>(initialActive);

  const park = (snap: CartSnapshot) =>
    setCarts(prev => ({ ...prev, [snap.id]: snap }));

  // switch requires: current snapshot (to park) and a function to apply target snapshot
  const switchTo = (id: CartId, currentSnap: CartSnapshot, applySnapshot: (snap: CartSnapshot) => void) => {
    // park current
    setCarts(prev => ({ ...prev, [currentSnap.id]: currentSnap }));
    setCarts(prev => {
      const snap = prev[id];
      if (!snap) return prev;
      const { [id]: _removed, ...rest } = prev;
      applySnapshot(snap);
      setActiveCartId(id);
      return rest;
    });
  };

  const close = (id: CartId) =>
    setCarts(prev => {
      const { [id]: _del, ...rest } = prev;
      return rest;
    });

  const setActiveAndClear = (nextId: CartId) => setActiveCartId(nextId);

  return { carts, activeCartId, setActiveAndClear, park, switchTo, close };
}
