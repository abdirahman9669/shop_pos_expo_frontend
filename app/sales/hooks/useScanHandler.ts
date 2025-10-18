import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { api, Product } from '../lib/api';

import { usdCeil2 } from '../lib/math';

type Feedback = { title: string; subtitle?: string; ok?: boolean } | null;

export function useScanHandler(addLineAndGetNewQty: (p: Product) => Promise<number>) {
  const [scanFeedback, setScanFeedback] = useState<Feedback>(null);
  const [beepTick, setBeepTick] = useState(0);

  const onScanned = useCallback(async (code: string) => {
    try {
      const p = await api.getProductByBarcode(code);
      if (!p) { Alert.alert('Not found', `No product for barcode ${code}`); return; }
      const qty = await addLineAndGetNewQty(p);
      setScanFeedback({ title: p.name || p.sku, subtitle: `Qty: ${qty}`, ok: true });
      setBeepTick((t) => t + 1);
    } catch (err: any) {
      Alert.alert('Scan lookup failed', err?.message || 'Could not fetch product');
      setScanFeedback({ title: 'Scan failed', subtitle: String(code), ok: false });
      setBeepTick((t) => t + 1);
    }
  }, [addLineAndGetNewQty]);

  const clearScanFeedback = () => setScanFeedback(null);

  return { scanFeedback, setScanFeedback, beepTick, setBeepTick, onScanned, clearScanFeedback };
}
