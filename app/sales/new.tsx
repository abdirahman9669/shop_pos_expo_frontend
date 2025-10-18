// app/new-sale.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList, Modal, Alert, KeyboardAvoidingView,
  Platform, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, Lot, Product } from '@/app/sales/lib/api';
import ScanSheet from '@/app/sales/components/ScanSheet';
import BatchPicker from '@/app/sales/components/BatchPicker';
import TransferModal from '@/app/sales/components/TransferModal';
import { API_BASE, TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

/** =========
 *  TYPES
 *  ========= */
type Device = { id: string; label?: string; name?: string };
type CashSession = { id: string; device_id: string; opened_at: string; closed_at: string | null };
type Customer = { id: string; name: string; phone?: string | null };
type Rate = { accounting: number; sell: number; buy: number };
type Account = { id: string; name: string; AccountType?: { name: string } };

type Line = {
  product_id: string;
  name: string;
  qty: number;
  unit_price_usd: number;
  batch_id?: string | null;
  store_id?: string | null;
  expiry_date?: string | null;
  lot_summary?: string;
};

// ===== MULTI-CART TYPES =====
type CartId = string;

type CartSnapshot = {
  id: CartId;
  label: string;
  created_at: number;

  device: Device | null;
  session: CashSession | null;
  customer: Customer | null;

  lines: Line[];
  usdAmount: string;
  sosNative: string;
  rate: Rate;
  exchangeAccepted: boolean;

  scanFeedback?: { title: string; subtitle?: string; ok?: boolean } | null;
  beepTick?: number;
};

/** =========
 *  HELPERS (USD 0.00 CEIL; SOS INT)
 *  ========= */
const n = (v: any, d = 0) => {
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : d;
};

// USD rounded **up** to 2 decimals; never lose a cent
const usdCeil2 = (v: any) => {
  const x = n(v, 0);
  const s = x >= 0 ? 1 : -1;
  return s * (Math.ceil(Math.abs(x) * 100) / 100);
};
const sosInt = (v: any) => Math.round(n(v, 0));
const money = (v: any) => usdCeil2(v).toFixed(2);

/** =========
 *  MAIN
 *  ========= */
export default function NewSale() {
  // Top selectors
  const [device, setDevice] = useState<Device | null>(null);
  const [session, setSession] = useState<CashSession | null>(null);

  // Customer (selected + overlay)
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOverlayOpen, setCustomerOverlayOpen] = useState(false);

  // Lines
  const [lines, setLines] = useState<Line[]>([]);

  // Payments (raw strings)
  const [usdAmount, setUsdAmount] = useState('');
  const [sosNative, setSosNative] = useState('');

  // FX
  const [rate, setRate] = useState<Rate>({ accounting: 27000, sell: 27000, buy: 28000 });
  const [rateLoading, setRateLoading] = useState(false);

  // Product overlay search
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  // Scanner
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ title: string; subtitle?: string; ok?: boolean } | null>(null);
  const [beepTick, setBeepTick] = useState(0);

  // Busy / msg
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Lots cache
  const lotsCacheRef = useRef<Map<string, Lot[]>>(new Map());

  // Batch picker
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [batchPickerForProduct, setBatchPickerForProduct] = useState<string | null>(null);
  const [batchPickerForLine, setBatchPickerForLine] = useState<string | null>(null);
  const [batchPickerLots, setBatchPickerLots] = useState<Lot[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferCtx, setTransferCtx] = useState<{
    productId: string; batchId: string; fromStoreId: string;
    fromStoreName?: string; fromOnHand?: number;
  } | null>(null);

  // Exchange acceptance state (single-tender overpay)
  const [exchangeAccepted, setExchangeAccepted] = useState(false);

  /** =========
   *  MULTI-CART: parked carts + active cart id
   *  ========= */
  const [carts, setCarts] = useState<Record<CartId, CartSnapshot>>({});
  const [activeCartId, setActiveCartId] = useState<CartId>('A'); // default lane “A”

  const snapshotFromState = (id: CartId, label = id): CartSnapshot => ({
    id,
    label,
    created_at: Date.now(),
    device,
    session,
    customer,
    lines,
    usdAmount,
    sosNative,
    rate,
    exchangeAccepted,
    scanFeedback,
    beepTick,
  });

  const applySnapshotToState = (snap: CartSnapshot) => {
    setDevice(snap.device);
    setSession(snap.session);
    setCustomer(snap.customer);
    setLines(snap.lines);
    setUsdAmount(snap.usdAmount);
    setSosNative(snap.sosNative);
    setRate(snap.rate);
    setExchangeAccepted(snap.exchangeAccepted);
    setScanFeedback(snap.scanFeedback ?? null);
    setBeepTick(snap.beepTick ?? 0);
    lotsCacheRef.current.clear();
  };

  const clearActiveState = (keepDeviceSession = true) => {
    setCustomer(null);
    setLines([]);
    setUsdAmount('');
    setSosNative('');
    setExchangeAccepted(false);
    setScanFeedback(null);
    setBeepTick(0);
    lotsCacheRef.current.clear();
    if (!keepDeviceSession) { setDevice(null); setSession(null); }
  };

  const parkActiveCart = (id: CartId = activeCartId, label?: string) => {
    const snap = snapshotFromState(id, label ?? (customer?.name || id));
    setCarts(prev => ({ ...prev, [id]: snap }));
  };

  const switchToCart = (id: CartId) => {
    parkActiveCart(activeCartId);
    setCarts(prev => {
      const snap = prev[id];
      if (!snap) return prev;
      const { [id]: _removed, ...rest } = prev;
      applySnapshotToState(snap);
      setActiveCartId(id);
      return rest;
    });
  };

  const newCart = () => {
    parkActiveCart(activeCartId);
    const used = new Set(Object.keys(carts).concat(activeCartId));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const nextLabel = alphabet.find(ch => !used.has(ch)) ?? `C${Object.keys(carts).length + 1}`;
    setActiveCartId(nextLabel);
    clearActiveState(true);
  };

  const closeParkedCart = (id: CartId) =>
    setCarts(prev => {
      const { [id]: _del, ...rest } = prev;
      return rest;
    });

  /** ---------- Fetchers ---------- */
  const fetchDevices = useCallback(api.getDevices, []);
  const fetchSessions = useCallback(api.getOpenSessions, []);
  const fetchCustomers = useCallback(api.getCustomers, []);
  const fetchLatestRate = useCallback(async (): Promise<Rate> => {
    setRateLoading(true);
    try { return await api.getLatestRate(); }
    catch { return { accounting: 27000, sell: 27000, buy: 28000 }; }
    finally { setRateLoading(false); }
  }, []);

  /** Defaults + rate */
  useEffect(() => {
    (async () => {
      try {
        const [devs, sess, latest] = await Promise.all([fetchDevices(), fetchSessions(), fetchLatestRate()]);
        setRate(latest);
        if (!device && devs[0]) setDevice(devs[0]);
        if (!session && sess[0]) setSession(sess[0]);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---------- Lots ---------- */
  const loadLotsForProduct = useCallback(async (productId: string, bustCache = false): Promise<Lot[]> => {
    if (!bustCache && lotsCacheRef.current.has(productId)) return lotsCacheRef.current.get(productId)!;
    try {
      const lots = await api.getLots(productId);
      lotsCacheRef.current.set(productId, lots);
      return lots;
    } catch { return []; }
  }, []);

  const pickFEFOLot = (lots: Lot[]): Lot | null => {
    if (!lots || lots.length === 0) return null;
    const withStock = lots.find(l => l.on_hand > 0);
    return withStock || lots[0];
  };

  /** ---------- Add line (FEFO) ---------- */
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

  /** ---------- Scanner (uses parent feedback + beepTick) ---------- */
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

  /** ---------- Lines edits ---------- */
  const setQty = (id: string, v: string) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, qty: Math.max(1, Math.floor(Number(v || '1'))) } : l));

  const setPrice = (id: string, v: string) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, unit_price_usd: usdCeil2(v) } : l));

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.product_id !== id));

  /** ---------- Batch picker ---------- */
  const openBatchPicker = useCallback(async (line: Line) => {
    setBatchPickerForLine(line.product_id);
    setBatchPickerForProduct(line.product_id);
    setBatchLoading(true);
    setBatchPickerOpen(true);
    try {
      const lots = await loadLotsForProduct(line.product_id, true);
      setBatchPickerLots(lots);
    } finally {
      setBatchLoading(false);
    }
  }, [loadLotsForProduct]);

  const chooseLotForCurrentLine = useCallback((lot: Lot) => {
    if (!batchPickerForLine) return;
    setLines(prev =>
      prev.map(l => l.product_id === batchPickerForLine
        ? {
            ...l,
            batch_id: lot.batch_id,
            store_id: lot.store_id,
            expiry_date: lot.expiry_date ?? null,
            lot_summary: `${lot.store_name} • ${lot.batch_number}${lot.expiry_date ? ` • exp ${lot.expiry_date}` : ''} • ${lot.on_hand}`,
          }
        : l
      )
    );
    setBatchPickerOpen(false);
    setBatchPickerForLine(null);
    setBatchPickerForProduct(null);
    setBatchPickerLots([]);
  }, [batchPickerForLine]);

  /** ---------- Transfer ---------- */
  const openTransfer = useCallback((lot: Lot) => {
    setBatchPickerOpen(false);
    setBatchPickerForLine(null);
    setBatchPickerForProduct(null);
    setBatchPickerLots([]);
    setTimeout(() => {
      setTransferCtx({
        productId: batchPickerForProduct!, batchId: lot.batch_id,
        fromStoreId: lot.store_id, fromStoreName: lot.store_name, fromOnHand: lot.on_hand,
      });
      setTransferOpen(true);
    }, 80);
  }, [batchPickerForProduct]);

  const closeTransfer = useCallback(() => {
    Keyboard.dismiss();
    setTransferOpen(false);
    setTransferCtx(null);
  }, []);

  /** ---------- Totals & payments (strict rounding) ---------- */
  const totalUsd = useMemo(
    () => usdCeil2(lines.reduce((s, l) => s + (l.qty * l.unit_price_usd), 0)),
    [lines]
  );
  const totalSos = useMemo(
    () => sosInt(totalUsd * (rate.sell || 27000)),
    [totalUsd, rate.sell]
  );

  // Parse inputs
  const paidUsdOnly = usdCeil2(usdAmount || 0);
  const paidSosOnly = sosInt(sosNative || 0);

  // Convert SOS to USD eq at SELL (display & equality)
  const paidSosUsdEq = usdCeil2((paidSosOnly || 0) / (rate.sell || 27000));

  const paidUsdEq = usdCeil2(paidUsdOnly + paidSosUsdEq);
  const remainingUsd = useMemo(
    () => usdCeil2(Math.max(0, totalUsd - paidUsdEq)),
    [totalUsd, paidUsdEq]
  );
  const remainingSos = useMemo(
    () => sosInt(remainingUsd * (rate.sell || 27000)),
    [remainingUsd, rate.sell]
  );

  // Overpay logic
  const extraUsd = useMemo(
    () => usdCeil2(Math.max(0, paidUsdEq - totalUsd)),
    [paidUsdEq, totalUsd]
  );
  const hasUSD = paidUsdOnly > 0;
  const hasSOS = paidSosOnly > 0;
  const singleTenderOverpay = extraUsd > 0 && (hasUSD !== hasSOS);
  const dualTenderOverpay    = extraUsd > 0 && hasUSD && hasSOS;

  // Reset acceptance when numbers change
  useEffect(() => { setExchangeAccepted(false); }, [usdAmount, sosNative, rate.sell, rate.buy, lines.length, totalUsd]);

  /** ----------
   *  Submit
   *  ---------- */
  const submit = useCallback(async () => {
    setMsg('');
    if (!device || !session) return setMsg('Select device and session.');
    if (!customer) return setMsg('Pick a customer.');
    if (lines.length === 0) return setMsg('Add at least one product line.');
    for (const l of lines) {
      if (!l.batch_id || !l.store_id) return setMsg(`Select batch/store for "${l.name}"`);
    }

    if (dualTenderOverpay) {
      return setMsg('Overpaid with both USD & SOS. Adjust amounts to match total (exchange not available).');
    }
    if (singleTenderOverpay && !exchangeAccepted) {
      return setMsg('Select exchange to continue.');
    }

    // Build payments to send (after trimming overpay if any)
    let sendUSD = paidUsdOnly;
    let sendSOS = paidSosOnly;

    if (singleTenderOverpay && exchangeAccepted) {
      if (hasUSD) {
        sendUSD = usdCeil2(sendUSD - extraUsd);
      } else if (hasSOS) {
        const reduceSOS = sosInt(extraUsd * (rate.sell || 27000));
        sendSOS = Math.max(0, sendSOS - reduceSOS);
      }
    }

    const payments: any[] = [];
    if (sendUSD > 0) payments.push({ method: 'CASH_USD', amount_usd: usdCeil2(sendUSD) });
    if (sendSOS > 0) payments.push({ method: 'CASH_SOS', amount_native: sosInt(sendSOS), rate_used: rate.sell || 27000 });

    setBusy(true);
    try {
      await api.postSale({
        device_id: device.id,
        cash_session_id: session.id,
        customer_id: customer.id,
        lines: lines.map(l => ({
          product_id: l.product_id,
          qty: l.qty,
          unit_price_usd: usdCeil2(l.unit_price_usd),
          batch_id: l.batch_id,
          store_id: l.store_id,
        })),
        payments,
        status: 'COMPLETED',
      });

      if (singleTenderOverpay && exchangeAccepted && extraUsd > 0) {
        await postExchangeForExtra(extraUsd, hasUSD ? 'USD2SOS' : 'SOS2USD', rate, AUTH);
      }

      Alert.alert('✅ Sale created', singleTenderOverpay && exchangeAccepted ? 'Change recorded via exchange.' : 'OK');

      // Clear only the active lane (keep device/session)
      clearActiveState(true);
    } catch (e: any) {
      setMsg(`❌ ${e?.message || 'Failed to create sale'}`);
    } finally {
      setBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    device, session, customer, lines,
    paidUsdOnly, paidSosOnly, extraUsd, exchangeAccepted,
    singleTenderOverpay, dualTenderOverpay, hasUSD, hasSOS, rate.sell
  ]);

  /** ----------
   *  Exchange POST helper
   *  ---------- */
  const postExchangeForExtra = async (
    extraUsdAmt: number,
    dir: 'USD2SOS' | 'SOS2USD',
    r: Rate,
    headers: any,
  ) => {
    // Load accounts (for from_method / to_method)
    let accounts: Account[] = [];
    try {
      const res = await fetch(`${API_BASE}/api/accounts?limit=200`, { headers });
      const j = await res.json();
      accounts = (j?.data ?? j ?? []).filter((a: any) => a?.AccountType?.name === 'CASH_ON_HAND');
    } catch { accounts = []; }
    const usdAcc = (accounts.find(a => /USD/i.test(a.name)) || accounts.find(a => a.name === 'Cash_USD'))?.name ?? null;
    const sosAcc = (accounts.find(a => /SOS/i.test(a.name)) || accounts.find(a => a.name === 'Cash_SOS'))?.name ?? null;

    const accounting = r.accounting || 27000;
    const sell = r.sell || 27000;
    const buy  = r.buy  || 28000;

    let cpAmt = 0, cpCur: 'USD' | 'SOS' = 'USD';
    let crAmt = 0, crCur: 'USD' | 'SOS' = 'SOS';
    let counter = 0;
    let from_method: string | null = null;
    let to_method: string | null = null;

    if (dir === 'USD2SOS') {
      cpAmt = usdCeil2(extraUsdAmt); cpCur = 'USD';
      crAmt = sosInt(extraUsdAmt * sell); crCur = 'SOS';
      counter = sell;
      from_method = sosAcc;
      to_method = usdAcc;
    } else {
      const sos_in = sosInt(extraUsdAmt * buy);
      cpAmt = sos_in; cpCur = 'SOS';
      crAmt = usdCeil2(sos_in / buy); crCur = 'USD';
      counter = buy;
      from_method = usdAcc;
      to_method = sosAcc;
    }

    const iarAmt = dir === 'USD2SOS' ? sosInt(extraUsdAmt * accounting) : usdCeil2(cpAmt / accounting);
    let fxGainUsd = 0, fxLossUsd = 0;
    if (dir === 'USD2SOS') {
      const diffSOS = crAmt - sosInt(extraUsdAmt * accounting);
      const diffUsd = diffSOS / accounting;
      fxGainUsd = diffUsd < 0 ? usdCeil2(-diffUsd) : 0;
      fxLossUsd = diffUsd > 0 ? usdCeil2(diffUsd) : 0;
    } else {
      const usdOut = crAmt;
      const iarUSD = iarAmt;
      const diffUSD = usdCeil2(usdOut - iarUSD);
      fxGainUsd = diffUSD < 0 ? usdCeil2(-diffUSD) : 0;
      fxLossUsd = diffUSD > 0 ? usdCeil2(diffUSD) : 0;
    }

    const body: any = {
      from_currency: dir === 'USD2SOS' ? 'USD' : 'SOS',
      amount: dir === 'USD2SOS' ? usdCeil2(extraUsdAmt) : cpAmt,
      counter_rate: counter,
      accounting_rate: accounting,
      from_method,
      to_method,
      preview_lines: {
        customer_pays__shop_receives: { amount: dir === 'USD2SOS' ? usdCeil2(cpAmt) : cpAmt, currency: cpCur },
        customer_receives__shop_pays: { amount: dir === 'USD2SOS' ? crAmt : usdCeil2(crAmt), currency: crCur },
        iar: { amount: dir === 'USD2SOS' ? iarAmt : usdCeil2(iarAmt), currency: dir === 'USD2SOS' ? 'SOS' : 'USD' },
        fx_gain_usd: usdCeil2(fxGainUsd),
        fx_loss_usd: usdCeil2(fxLossUsd),
      },
      cp_amount: dir === 'USD2SOS' ? usdCeil2(cpAmt) : cpAmt,
      cp_currency: cpCur,
      cr_amount: dir === 'USD2SOS' ? crAmt : usdCeil2(crAmt),
      cr_currency: crCur,
      iar_amount: dir === 'USD2SOS' ? iarAmt : usdCeil2(iarAmt),
      iar_currency: dir === 'USD2SOS' ? 'SOS' : 'USD',
      fx_gain_usd: usdCeil2(fxGainUsd),
      fx_loss_usd: usdCeil2(fxLossUsd),
    };

    const rres = await fetch(`${API_BASE}/api/exchange`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    const j = await rres.json();
    if (!rres.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${rres.status}`);
  };

  /** ---------- Add + toast helper ---------- */
  const addAndToast = useCallback(async (item: Product) => {
    await addLineAndGetNewQty(item);
  }, [addLineAndGetNewQty]);

  /** ---------- Overlay open/close (guarded) ---------- */
  const openProductSearch = useCallback(() => { setSearchOverlayOpen(prev => (prev ? prev : true)); }, []);
  const closeProductSearch = useCallback(() => { setSearchOverlayOpen(prev => (prev ? false : prev)); Keyboard.dismiss(); }, []);
  const openCustomerSearch = useCallback(() => { setCustomerOverlayOpen(prev => (prev ? prev : true)); }, []);
  const closeCustomerSearch = useCallback(() => { setCustomerOverlayOpen(prev => (prev ? false : prev)); Keyboard.dismiss(); }, []);

  /** ---------- Alpha top-5 helpers ---------- */
  const fetchProductsAlphaTop5 = useCallback(async (): Promise<Product[]> => {
    const broad = await api.getProducts('a');
    return [...broad].sort((a, b) => (a.name || '').localeCompare(b.name || '')).slice(0, 5);
  }, []);

  const fetchCustomersAlphaTop5 = useCallback(async (): Promise<Customer[]> => {
    const rows = await fetchCustomers('a');
    return [...rows].sort((a, b) => (a.name || '').localeCompare(b.name || '')).slice(0, 5);
  }, [fetchCustomers]);

/** ----------
 *  Exchange preview block (UI-only)
 *  ---------- */
/** ----------
 *  Exchange preview block (UI-only) — FIXED TEXT
 *  ---------- */
const ExchangeBlock = () => {
  if (extraUsd <= 0) return null;

  // Dual tender → block (no exchange)
  if (dualTenderOverpay) {
    return (
      <View style={sx.exBox}>
        <Text style={sx.exTitle}>Extra detected: ${money(extraUsd)}</Text>
        <Text style={sx.exP}>Exchange isn’t available when both USD and SOS are provided.</Text>
        <Text style={sx.exHint}>Reduce one of the payments so total equals the sale amount.</Text>
      </View>
    );
  }

  // Single tender overpay → show correct give-back preview
  const sell = rate.sell || 27000;
  const buy  = rate.buy  || 28000;

  // What direction are we exchanging?
  const dir = hasUSD ? 'USD → SOS' : 'SOS → USD';
  const rateUsed = hasUSD ? sell : buy;

  // Build clear preview lines
  let line1 = '';
  if (hasUSD) {
    // Customer handed extra in USD. Show SOS change using SELL.
    const sosBack = sosInt(extraUsd * sell);
    line1 = `Customer paid $${money(extraUsd)} extra, and will receive ${sosBack.toLocaleString()} SOS back.`;
  } else {
    // Customer handed extra in SOS. Show USD change using BUY.
    // Compute the SOS amount equivalent to the USD-extra at BUY,
    // then show the USD we’ll give back at BUY (same value, 0.00-precise).
    const sosExtra = sosInt(extraUsd * buy);
    const usdBack  = usdCeil2(sosExtra / buy); // should equal extraUsd (subject to rounding to 0.00)
    line1 = `Customer paid ${sosExtra.toLocaleString()} SOS extra, and will receive $${money(usdBack)} USD back.`;
  }

  return (
    <View style={sx.exBox}>
      <Text style={sx.exTitle}>Extra detected: ${money(extraUsd)}</Text>
      <Text style={sx.exP}>
        Sale total: ${money(totalUsd)}   •   Paid: ${money(paidUsdEq)}   •   Extra: ${money(extraUsd)}
      </Text>
      <Text style={sx.exP}>
        Direction: <Text style={{fontWeight:'800'}}>{dir}</Text>   •   Rate: {rateUsed}
      </Text>
      <Text style={[sx.exP, { marginTop: 6 }]}>{line1}</Text>

      <TouchableOpacity
        onPress={() => setExchangeAccepted(true)}
        disabled={exchangeAccepted}
        style={[sx.exBtn, exchangeAccepted && { opacity: 0.6 }]}
      >
        <Text style={sx.exBtnTxt}>{exchangeAccepted ? 'Exchange accepted' : 'Accept exchange'}</Text>
      </TouchableOpacity>
      <Text style={sx.exHint}>We’ll record the change via Exchange and post the sale exact.</Text>
    </View>
  );
};

  /** ----------
   *  UI
   *  ---------- */
  const submitDisabled =
    busy ||
    (extraUsd > 0 && (dualTenderOverpay || !exchangeAccepted));

  const activeSubtotal = lines.reduce((s, l) => s + l.qty * l.unit_price_usd, 0);
  const activeCount = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => '_'}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={s.wrap}>
              {/* Cart tabs */}
              <CartTabs
                activeId={activeCartId}
                parked={carts}
                activeSubtotal={activeSubtotal}
                activeCount={activeCount}
                onNew={newCart}
                onSwitch={switchToCart}
                onClose={closeParkedCart}
              />

              <Text style={s.title}>New Sale</Text>
              {msg ? <Text style={s.notice}>{msg}</Text> : null}

              {/* Device / Session */}
              <Picker
                label="Device"
                value={device?.id ? (device.label || device.name || device.id) : ''}
                onOpen={async (setList) => setList(await fetchDevices())}
                onPick={(v:any)=>{ setDevice(v); setSession(null); }}
              />
              <Picker
                label="Cash Session"
                value={session?.opened_at ? new Date(session.opened_at).toLocaleString() : ''}
                onOpen={async (setList) => {
                  const arr = await fetchSessions();
                  setList(device ? arr.filter((s:any)=>s.device_id===device.id) : arr);
                }}
                onPick={setSession}
              />

              {/* Customer (overlay same as product) */}
              <Text style={s.label}>Customer</Text>
              <TouchableOpacity style={s.select} onPress={openCustomerSearch}>
                <Text style={s.selectText}>
                  {customer ? customer.name : 'Select customer…'}
                </Text>
                {customer?.phone ? <Text style={{ color: '#666', marginTop: 4 }}>{customer.phone}</Text> : null}
              </TouchableOpacity>

              {/* Search + Scan triggers */}
              <View style={[s.topRow, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[s.searchBtn, searchOverlayOpen && { opacity: 0.6 }]}
                  onPress={openProductSearch}
                  disabled={searchOverlayOpen}
                >
                  <Text style={s.searchBtnText}>Search products…</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.scanBtn} onPress={() => setScanOpen(true)}>
                  <Text style={s.scanText}>Scan</Text>
                </TouchableOpacity>
              </View>

              {/* Lines */}
              <Text style={[s.label, { marginTop: 18 }]}>Lines</Text>
              <View style={[s.row, s.headerRow]}>
                <Text style={[s.cell, s.colName2, s.headerText]}>name</Text>
                <Text style={[s.cell, s.colQty, s.headerText]}>qty</Text>
                <Text style={[s.cell, s.colPrice2, s.headerText]}>price</Text>
                <Text style={[s.cell, s.colLot, s.headerText]}>batch • store • exp • on-hand</Text>
                <Text style={[s.cell, s.colTotal, s.headerText]}>total</Text>
                <Text style={[s.cell, s.colActS, s.headerText]}> </Text>
              </View>

              {lines.length === 0 ? (
                <Text style={s.empty}>No lines yet.</Text>
              ) : (
                lines.map(l => (
                  <View key={l.product_id} style={[s.row, s.dataRow]}>
                    <Text style={[s.cell, s.colName2]} numberOfLines={1}>{l.name}</Text>
                    <TextInput style={[s.cellInput, s.colQty]} keyboardType="number-pad" value={String(l.qty)} onChangeText={(v) => setQty(l.product_id, v)} />
                    <TextInput style={[s.cellInput, s.colPrice2]} keyboardType="decimal-pad" value={String(l.unit_price_usd)} onChangeText={(v) => setPrice(l.product_id, v)} />
                    <TouchableOpacity style={[s.cell, s.colLot, s.lotBtn]} onPress={() => openBatchPicker(l)}>
                      <Text numberOfLines={1} style={s.lotText}>{l.lot_summary || 'Select batch/store'}</Text>
                    </TouchableOpacity>
                    <Text style={[s.cell, s.colTotal]}>{money(l.qty * l.unit_price_usd)}</Text>
                    <View style={[s.cell, s.colActS]}>
                      <TouchableOpacity onPress={() => removeLine(l.product_id)} style={s.xBtn}>
                        <Text style={{ color: 'white', fontWeight: '800' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Payments */}
              <Text style={[s.label, { marginTop: 20 }]}>Payments</Text>
              <View style={s.payRow}>
                <Text style={{ fontWeight: '800', marginBottom: 6 }}>Cash (USD)</Text>
                <Text style={s.subLabel}>Amount (USD)</Text>
                <TextInput
                  value={usdAmount}
                  onChangeText={setUsdAmount}
                  keyboardType="decimal-pad"
                  style={s.input}
                  placeholder="0.00"
                />
              </View>

              <View style={s.payRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', marginBottom: 6 }}>Cash (SOS)</Text>
                  <TouchableOpacity onPress={async () => setRate(await fetchLatestRate())} style={[s.tagBtn, { paddingVertical: 6 }]}>
                    <Text style={s.tagTxt}>{rateLoading ? 'Rate…' : 'Refresh rate'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.subLabel}>Amount (SOS)</Text>
                <TextInput value={sosNative} onChangeText={setSosNative} keyboardType="number-pad" style={s.input} placeholder="0" />
                <Text style={{ color: '#666', marginTop: 6 }}>
                  Using sell rate: <Text style={{ fontWeight: '800' }}>{rate.sell}</Text>  →  USD eq: <Text style={{ fontWeight: '800' }}>
                    {usdCeil2((sosInt(sosNative||0)) / (rate.sell || 27000)).toFixed(2)}
                  </Text>
                </Text>
              </View>

              {/* Totals */}
              <View style={{ marginTop: 12 }}>
                <Text>
                  Total USD: <Text style={{ fontWeight: '800' }}>{totalUsd.toFixed(2)}</Text>
                  {'   '}Total SOS: <Text style={{ fontWeight: '800' }}>{totalSos.toLocaleString()}</Text>
                </Text>
                <Text style={{ marginTop: 4 }}>
                  Paid USD: <Text style={{ fontWeight: '800' }}>{paidUsdEq.toFixed(2)}</Text>
                  {'   '}Paid SOS(eq): <Text style={{ fontWeight: '800' }}>{sosInt(paidUsdEq * (rate.sell || 27000)).toLocaleString()}</Text>
                </Text>
                <Text style={{ marginTop: 4, fontWeight: '800' }}>
                  Remaining USD: {remainingUsd.toFixed(2)}   |   Remaining SOS: {remainingSos.toLocaleString()}
                </Text>
              </View>

              {/* Exchange block (when needed) */}
              <ExchangeBlock />
            </View>
          }
          ListFooterComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <View style={s.totals}><Text style={s.totalText}>Total (USD): {totalUsd.toFixed(2)}</Text></View>
              <TouchableOpacity style={[s.submit, submitDisabled && { opacity: 0.5 }]} disabled={submitDisabled} onPress={submit}>
                <Text style={s.submitText}>
                  {busy ? 'Saving…' : (extraUsd > 0 && (dualTenderOverpay || !exchangeAccepted)) ? 'Select exchange to continue' : 'Create Sale'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Scanner */}
        <ScanSheet
          visible={scanOpen}
          onClose={() => setScanOpen(false)}
          onScanned={onScanned}
          feedback={scanFeedback}
          beepSignal={beepTick}
        />

        {/* Batch picker */}
        <BatchPicker
          visible={batchPickerOpen}
          loading={batchLoading}
          lots={batchPickerLots}
          onUseLot={chooseLotForCurrentLine}
          onRequestTransfer={(lot) => openTransfer(lot)}
          onClose={() => setBatchPickerOpen(false)}
        />

        {/* Transfer modal */}
        <TransferModal
          visible={transferOpen}
          ctx={transferCtx}
          loadStores={api.getStores}
          onSubmit={async (toStoreId, qty) => {
            if (!transferCtx) return;
            await api.postTransfer({
              product_id: transferCtx.productId,
              batch_id: transferCtx.batchId,
              from_store_id: transferCtx.fromStoreId,
              to_store_id: toStoreId,
              qty,
            });
            await loadLotsForProduct(transferCtx.productId, true);
          }}
          onClose={closeTransfer}
        />

        {/* Product search overlay (unchanged) */}
        <ProductOverlay
          visible={searchOverlayOpen}
          onClose={closeProductSearch}
          onAdd={async (item) => { await addAndToast(item); closeProductSearch(); }}
          fetchAlphaTop5={fetchProductsAlphaTop5}
          search={(q) => api.getProducts(q)}
          getOnHand={async (pid) => {
            try {
              const lots = await api.getLots(pid);
              return lots.reduce((s, l) => s + Number(l.on_hand || 0), 0);
            } catch { return undefined; }
          }}
        />

        {/* Customer search overlay (IDENTICAL behavior) */}
        <CustomerOverlay
          visible={customerOverlayOpen}
          onClose={closeCustomerSearch}
          onPick={(c) => { setCustomer(c); closeCustomerSearch(); }}
          fetchAlphaTop5={fetchCustomersAlphaTop5}
          search={(q) => fetchCustomers(q)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** =========
 *  CART TABS (tiny UI for park/switch)
 *  ========= */
function CartTabs(props: {
  activeId: string;
  parked: Record<string, CartSnapshot>;
  activeSubtotal: number;
  activeCount: number;
  onNew: () => void;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const { activeId, parked, activeSubtotal, activeCount, onNew, onSwitch, onClose } = props;

  const pills = Object.values(parked)
    .sort((a, b) => a.created_at - b.created_at)
    .map(snap => {
      const count = (snap.lines || []).reduce((s, l) => s + l.qty, 0);
      const subtotal = (snap.lines || []).reduce((s, l) => s + l.qty * l.unit_price_usd, 0);
      return (
        <View key={snap.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => onSwitch(snap.id)} style={tabStyles.pill}>
            <Text style={tabStyles.pillTxt}>
              {snap.label} · {count} · ${usdCeil2(subtotal).toFixed(2)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onClose(snap.id)} style={tabStyles.closeBtn}>
            <Text style={tabStyles.closeTxt}>×</Text>
          </TouchableOpacity>
        </View>
      );
    });

  return (
    <View style={tabStyles.wrap}>
      <View style={[tabStyles.pill, { backgroundColor: '#000' }]}>
        <Text style={[tabStyles.pillTxt, { color: '#fff' }]}>
          {activeId} · {activeCount} · ${usdCeil2(activeSubtotal).toFixed(2)}
        </Text>
      </View>
      {pills}
      <TouchableOpacity onPress={onNew} style={tabStyles.addBtn}>
        <Text style={tabStyles.addTxt}>+ New</Text>
      </TouchableOpacity>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' },
  pill: { backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillTxt: { fontWeight: '800', color: '#333' },
  addBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  addTxt: { color: '#fff', fontWeight: '800' },
  closeBtn: { marginLeft: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontWeight: '900', color: '#333', marginTop: -1 },
});

/** =========
 *  PICKER (Device/Session)
 *  ========= */
function Picker(props: {
  label: string;
  value: string;
  onOpen: (setList: (v: any[]) => void) => void | Promise<void>;
  onPick: (v: any) => void;
}) {
  const { label, value, onOpen, onPick } = props;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const openModal = useCallback(async () => {
    setOpen(true); setLoading(true);
    try { await onOpen(setList); } finally { setLoading(false); }
  }, [onOpen]);

  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.select} onPress={openModal}>
        <Text style={s.selectText}>{value || `Select ${label.toLowerCase()}…`}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 12, flex: 1 }}>
            <Text style={s.title}>Select {label}</Text>
            {loading ? (
              <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
            ) : (
              <FlatList
                data={list}
                keyExtractor={(i) => i.id}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[s.row, s.dataRow]} onPress={() => { onPick(item); setOpen(false); }}>
                    <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>
                      {item.label || item.name || item.id}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={s.empty}>No options</Text>}
              />
            )}
            <TouchableOpacity onPress={() => setOpen(false)} style={[s.cancelBtn, { alignSelf: 'center' }]}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

/** =========
 *  BLUR/DIM BACKDROP (shared)
 *  ========= */
function Backdrop({ onPress }: { onPress: () => void }) {
  const BlurRef = useRef<any>(null);
  const tried = useRef(false);

  if (!tried.current && BlurRef.current === null) {
    tried.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('expo-blur');
      BlurRef.current = mod?.BlurView || null;
    } catch { BlurRef.current = null; }
  }
  const BlurView = BlurRef.current;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={StyleSheet.absoluteFill}
    >
      {BlurView ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
      )}
    </TouchableOpacity>
  );
}

/** =========
 *  PRODUCT SEARCH OVERLAY (unchanged, but shows on-hand)
 *  ========= */
function ProductOverlay(props: {
  visible: boolean;
  onClose: () => void;
  onAdd: (p: Product) => void | Promise<void>;
  fetchAlphaTop5: () => Promise<Product[]>;
  search: (q: string) => Promise<Product[]>;
  getOnHand: (productId: string) => Promise<number | undefined>;
}) {
  const { visible, onClose, onAdd, fetchAlphaTop5, search, getOnHand } = props;

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [closing, setClosing] = useState(false);
  const [onHandMap, setOnHandMap] = useState<Record<string, number | undefined>>({});

  const inputRef = useRef<TextInput | null>(null);
  const focusTimer = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    focusTimer.current = setTimeout(() => inputRef.current?.focus(), 60);
    return () => { if (focusTimer.current) clearTimeout(focusTimer.current); };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = q.trim() ? await search(q.trim()) : await fetchAlphaTop5();
        if (!alive) return;
        setItems(data);

        const ids = data.map(d => d.id);
        (async () => {
          const entries: [string, number | undefined][] = [];
          for (const id of ids) {
            try { entries.push([id, await getOnHand(id)]); } catch { entries.push([id, undefined]); }
          }
          if (!alive) return;
          const m: Record<string, number | undefined> = {};
          for (const [k,v] of entries) m[k] = v;
          setOnHandMap(m);
        })();
      } finally {
        if (alive) setLoading(false);
      }
    };
    const t = setTimeout(run, q.trim() ? 200 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [visible, q, search, fetchAlphaTop5, getOnHand]);

  const safeClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    Keyboard.dismiss();
    setTimeout(() => { onClose(); setClosing(false); }, 80);
  }, [closing, onClose]);

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={safeClose} transparent>
      <View style={s.overlayWrap}>
        <Backdrop onPress={safeClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          style={{ flex: 1, justifyContent: 'flex-start' }}
        >
          <View style={[s.overlayCard, { marginTop: 56 }]}>
            <TextInput
              ref={inputRef}
              style={s.overlayInput}
              placeholder="Search products…"
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {loading ? (
              <View style={[s.center, { paddingVertical: 20 }]}>
                <ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={s.sep} />}
                renderItem={({ item }) => {
                  const price = typeof item.price_usd === 'string'
                    ? money(item.price_usd)
                    : money(Number(item.price_usd || 0));
                  const onHand = onHandMap[item.id];
                  return (
                    <TouchableOpacity style={[s.row, s.dataRow]} onPress={async () => { await onAdd(item); }}>
                      <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[s.cell, { width: 90 }]} numberOfLines={1}>{price}</Text>
                      <Text style={[s.cell, { width: 110 }]} numberOfLines={1}>
                        {onHand != null ? `on-hand ${onHand}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 380 }}
                ListEmptyComponent={<Text style={s.empty}>No matches</Text>}
              />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={safeClose} style={s.overlayCloseBtn}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** =========
 *  CUSTOMER SEARCH OVERLAY (identical mechanics/UX)
 *  ========= */
function CustomerOverlay(props: {
  visible: boolean;
  onClose: () => void;
  onPick: (c: Customer) => void | Promise<void>;
  fetchAlphaTop5: () => Promise<Customer[]>;
  search: (q: string) => Promise<Customer[]>;
}) {
  const { visible, onClose, onPick, fetchAlphaTop5, search } = props;

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Customer[]>([]);
  const [closing, setClosing] = useState(false);

  const inputRef = useRef<TextInput | null>(null);
  const focusTimer = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    focusTimer.current = setTimeout(() => inputRef.current?.focus(), 60);
    return () => { if (focusTimer.current) clearTimeout(focusTimer.current); };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = q.trim() ? await search(q.trim()) : await fetchAlphaTop5();
        if (alive) setItems(data);
      } finally {
        if (alive) setLoading(false);
      }
    };
    const t = setTimeout(run, q.trim() ? 200 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [visible, q, search, fetchAlphaTop5]);

  const safeClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    Keyboard.dismiss();
    setTimeout(() => { onClose(); setClosing(false); }, 80);
  }, [closing, onClose]);

  if (!visible) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={safeClose} transparent>
      <View style={s.overlayWrap}>
        <Backdrop onPress={safeClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          style={{ flex: 1, justifyContent: 'flex-start' }}
        >
          <View style={[s.overlayCard, { marginTop: 56 }]}>
            <TextInput
              ref={inputRef}
              style={s.overlayInput}
              placeholder="Search customers…"
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {loading ? (
              <View style={[s.center, { paddingVertical: 20 }]}>
                <ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={s.sep} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.row, s.dataRow]}
                    onPress={async () => { await onPick(item); }}
                  >
                    <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.cell, { width: 150 }]} numberOfLines={1}>{item.phone || ''}</Text>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 380 }}
                ListEmptyComponent={<Text style={s.empty}>No matches</Text>}
              />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={safeClose} style={s.overlayCloseBtn}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** =========
 *  STYLES
 *  ========= */
const s = StyleSheet.create({
  xBtn: { backgroundColor: 'black', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  notice: { padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 },

  label: { fontWeight: '700', marginTop: 6 },
  subLabel: { fontWeight: '600', marginTop: 6, color: '#555' },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },

  select: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  selectText: { fontWeight: '700' },

  topRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  searchBtn: {
    flex: 1,
    borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white',
  },
  searchBtnText: { color: '#666', fontWeight: '700' },

  scanBtn: { backgroundColor: 'black', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  scanText: { color: 'white', fontWeight: '800' },

  sep: { height: 6, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 44 },
  headerRow: { backgroundColor: '#f4f4f4', borderBottomWidth: 1, borderBottomColor: '#ebebeb', paddingVertical: 10 },
  headerText: { fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  dataRow: { backgroundColor: 'white', paddingVertical: 10 },

  cell: { paddingHorizontal: 4 },
  colName2: { flexBasis: '26%', flexGrow: 1, flexShrink: 1 },
  colQty:   { flexBasis: '12%', flexGrow: 0, flexShrink: 1 },
  colPrice2:{ flexBasis: '16%', flexGrow: 0, flexShrink: 1 },
  colLot:   { flexBasis: '28%', flexGrow: 1, flexShrink: 1 },
  colTotal: { flexBasis: '14%', flexGrow: 0, flexShrink: 1 },
  colActS:  { flexBasis: '4%',  flexGrow: 0, flexShrink: 0, alignItems: 'flex-end' },

  lotBtn: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white' },
  lotText: { fontWeight: '600', color: '#333' },

  cellInput: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white', marginHorizontal: 4 },

  totals: { alignItems: 'flex-end', marginTop: 8 },
  totalText: { fontWeight: '800', fontSize: 16 },

  submit: { marginTop: 14, backgroundColor: 'black', padding: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#aaa' },

  empty: { textAlign: 'center', color: '#777', marginTop: 12 },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },

  // Payments
  payRow: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12, marginTop: 8 },
  tagBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tagTxt: { color: '#fff', fontWeight: '800' },

  // Overlays shared
  overlayWrap: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
  overlayCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  overlayInput: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white', fontWeight: '700', marginBottom: 8 },
  overlayCloseBtn: { backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});

// Exchange box styles
const sx = StyleSheet.create({
  exBox: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ddd', padding: 12, marginTop: 12 },
  exTitle: { fontWeight: '800', fontSize: 16 },
  exP: { marginTop: 6, color: '#333', fontWeight: '600' },
  exHint: { marginTop: 6, color: '#888' },
  exBtn: { marginTop: 10, backgroundColor: '#000', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  exBtnTxt: { color: '#fff', fontWeight: '800' },
});
