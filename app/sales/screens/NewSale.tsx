import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Modal, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

 import { api, Lot, Product } from '../lib/api';
import { Line, Device, CashSession, Customer, Rate, CartSnapshot } from '../lib/types';
// around line ~15
import { usdCeil2, sosInt, money, roundSOS1000, calcRoundingDiff } from '../lib/math';

import { useSaleCart } from '../hooks/useSaleCart';
import { useCarts } from '../hooks/useCarts';
import { useSalePayments } from '../hooks/useSalePayments';
import { useScanHandler } from '../hooks/useScanHandler';
import ExchangeBlock from '../components/exchange/ExchangeBlock';

import ScanSheet from '../components/ScanSheet';
import BatchPicker from '../components/BatchPicker';
import TransferModal from '../components/TransferModal';
import ProductOverlay from '../components/overlays/ProductOverlay';
import CustomerOverlay from '../components/overlays/CustomerOverlay';
import Picker from '../components/Picker';
import CartTabs from '../components/CartTabs';

import { API_BASE, TOKEN } from '@/src/config';
import { postExchangeForExtra } from '../lib/exchange';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

export default function NewSale() {
  // Device / session / customer
  const [device, setDevice] = useState<Device | null>(null);
  const [session, setSession] = useState<CashSession | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOverlayOpen, setCustomerOverlayOpen] = useState(false);

  // Product search overlay
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

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

  // Exchange acceptance
  const [exchangeAccepted, setExchangeAccepted] = useState(false);

  // Carts (multi-lane)
  const { carts, activeCartId, setActiveAndClear, park, switchTo, close } = useCarts('A');

  // Lines & lots
  const {
    lines, setLines, addLineAndGetNewQty, setQty, setPrice, removeLine,
    loadLotsForProduct, clearLines
  } = useSaleCart();


 // FX (non-null with zeros until backend loads it)
 const [rate, setRate] = useState<Rate>({ accounting: 0, sell: 0, buy: 0 });
 const [rateLoading, setRateLoading] = useState(false);

  // around line ~70 (after exchangeAccepted or nearby)
const [roundSOSMode, setRoundSOSMode] = useState<'auto' | 'up' | 'down'>('auto');

 // 1) pick the accounting rate for sales math
 const SALE_RATE = rate.accounting || 0;  

// 2) object for places that read `.sell` (we overwrite it with accounting)
 const saleRateObj = { ...rate, sell: SALE_RATE };

  // Payments & totals
// 3) use this for your payments math
const {
  usdAmount, setUsdAmount,
  sosNative, setSosNative,
  totalUsd, totalSos,
  paidUsdOnly, paidSosOnly,
  paidUsdEq, remainingUsd, remainingSos,
  extraUsd, hasUSD, hasSOS, singleTenderOverpay, dualTenderOverpay
} = useSalePayments(lines, saleRateObj);

  // Scanner
  const [scanOpen, setScanOpen] = useState(false);
  const { scanFeedback, setScanFeedback, beepTick, setBeepTick, onScanned } = useScanHandler(addLineAndGetNewQty);

  // Busy / msg
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  /** =========
   *  CART SNAPSHOTS
   *  ========= */
  const snapshotFromState = (id: string, label = id): CartSnapshot => ({
    id, label, created_at: Date.now(),
    device, session, customer,
    lines,
    usdAmount, sosNative,
    rate,
    exchangeAccepted,
    scanFeedback, beepTick
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
  };

  const clearActiveState = (keepDeviceSession = true) => {
    setCustomer(null);
    clearLines();
    setUsdAmount('');
    setSosNative('');
    setExchangeAccepted(false);
    setScanFeedback(null);
    setBeepTick(0);
    if (!keepDeviceSession) { setDevice(null); setSession(null); }
  };

  const newCart = () => {
    const current = snapshotFromState(activeCartId, customer?.name || activeCartId);
    park(current);
    const used = new Set(Object.keys(carts).concat(activeCartId));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const nextLabel = alphabet.find(ch => !used.has(ch)) ?? `C${Object.keys(carts).length + 1}`;
    setActiveAndClear(nextLabel);
    clearActiveState(true);
  };

  const switchToCart = (id: string) => {
    const current = snapshotFromState(activeCartId, customer?.name || activeCartId);
    switchTo(id, current, applySnapshotToState);
  };

  const closeParkedCart = (id: string) => close(id);


  /** ---------- Fetchers ---------- */
  const fetchDevices = useCallback(api.getDevices, []);
  const fetchSessions = useCallback(api.getOpenSessions, []);
  const fetchCustomers = useCallback(api.getCustomers, []);
 const fetchLatestRate = useCallback(async (): Promise<Rate> => {
setRateLoading(true);                 // start spinner
  try {
    const latest = await api.getLatestRate(); // throws if missing/invalid
    setRateLoading(false);              // ✅ stop spinner only on success
    return latest;
  } catch (e) {
    // ❌ keep spinner ON when no rate (or request failed)
    // return a zero rate so the rest of the UI stays disabled
    return { accounting: 0, sell: 0, buy: 0 };
  }
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
  }, [batchPickerForLine, setLines]);

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

  /** ---------- Reset exchange accept on amount changes ---------- */
  useEffect(() => { setExchangeAccepted(false); }, [usdAmount, sosNative, SALE_RATE, lines.length, totalUsd]); 
  
//////////////
// ----- compute SOS needed BEFORE applying any SOS payment (USD only contributes)
const usdPartOnly = usdCeil2(usdAmount || 0);
const usdStillNeeded = usdCeil2(Math.max(0, totalUsd - usdPartOnly));
const neededSOSRawBeforeSOS = sosInt(usdStillNeeded * (SALE_RATE));

// ----- round that "needed SOS" by the current mode (cashier target)
const neededDownSOS = roundSOS1000(neededSOSRawBeforeSOS, 'down');
const neededUpSOS   = roundSOS1000(neededSOSRawBeforeSOS, 'up');
const neededAutoSOS = roundSOS1000(neededSOSRawBeforeSOS, 'nearest');

const neededTargetSOS =
  roundSOSMode === 'auto'
    ? neededAutoSOS
    : (roundSOSMode === 'up' ? neededUpSOS : neededDownSOS);

// ----- who paid with what
const onlyUSD =  hasUSD && !hasSOS;
const onlySOS = !hasUSD &&  hasSOS;
const both    =  hasUSD &&  hasSOS;

// ----- compute "extra" with a tiny epsilon to avoid float noise (USD path)
const EPS = 0.01;
const paidUsdEqForLogic =
  usdCeil2(
    usdCeil2(usdAmount || 0) +
    (sosInt(sosNative || 0) / (SALE_RATE))
  );
const diffToTotal = paidUsdEqForLogic - totalUsd;
const extraUsdSafe = diffToTotal > EPS ? usdCeil2(diffToTotal) : 0;

// ===== NEW: decide by SOS against target =====
const sosPaid = sosInt(sosNative || 0);
const sosOverTarget = Math.max(0, sosPaid - neededTargetSOS);
// Convert that SOS-only overage into USD (same sell rate) for apples-to-apples
const sosOverTargetUsd = usdCeil2(sosOverTarget / (SALE_RATE));

// If SOS is used and paid SOS does NOT exceed the rounded target => suppress exchange.
// If it does exceed, cap the exchange amount to that SOS overage (never more).
let extraUsdForExchange = extraUsdSafe;
if (onlySOS || both) {
  if (sosOverTarget === 0) {
    extraUsdForExchange = 0;
  } else {
    extraUsdForExchange = usdCeil2(Math.min(extraUsdSafe, sosOverTargetUsd));
  }
}
// ---- single source of truth for whether exchange is required right now
const exchangeNeeded = extraUsdForExchange > 0 && (dualTenderOverpay || !exchangeAccepted);

  //////ex round////////////////////////////////////////////////////////////////

  // NewSale.tsx
const [exRoundMode, setExRoundMode] =
  useState<'auto' | 'up' | 'down'>('auto');

  // NewSale.tsx (near submitDisabled / other derived values)
const exDir: 'USD2SOS' | 'SOS2USD' =
  hasUSD && !hasSOS ? 'USD2SOS'
  : hasSOS && !hasUSD ? 'SOS2USD'
  : 'USD2SOS'; // default, won't be used if dualTender

// 👇 For UI/rounding ONLY:
// - USD→SOS should use backend SELL (e.g., 27,000)
// - SOS→USD should use backend ACCOUNTING (e.g., 28,000)
const exRateForUI = exDir === 'USD2SOS' ? rate.sell : rate.accounting;

// raw native we’ll round *for the exchange UI* (only matters for USD→SOS)
const exRawNative = exDir === 'USD2SOS'
  ? sosInt(extraUsdForExchange * exRateForUI)  // SOS to pay back
  : 0;

// rounded candidates (re-use your helpers)
const exDown = roundSOS1000(exRawNative, 'down');
const exUp   = roundSOS1000(exRawNative, 'up');
const exAuto = roundSOS1000(exRawNative, 'nearest');

const exChosenNative =
  exRoundMode === 'auto' ? exAuto
  : exRoundMode === 'up' ? exUp
  : exDown;

const exDiffNative = exChosenNative - exRawNative; // >0 means we pay more SOS
const exDirection  = exDiffNative > 0 ? 'LOSS' : (exDiffNative < 0 ? 'GAIN' : 'NONE');


// Handy tap handler you’ll pass into the exchange box
const onTapExchangeRounding = useCallback(() => {
  setExRoundMode(prev => {
    if (prev === 'auto') {
      const nearestIsDown = exAuto === exDown && exAuto !== exUp;
      return nearestIsDown ? 'up' : 'down';
    }
    return prev === 'up' ? 'down' : 'up';
  });
}, [exAuto, exDown, exUp]);

useEffect(() => {
  setExRoundMode('auto');
}, [extraUsdForExchange, exDir, rate.sell, rate.accounting]);

///////////////////////////////////////////////////////////////////////////////////////////

/////////////////
  /** ----------
   *  Submit (unchanged behavior)
   *  ---------- */
  const submit = useCallback(async () => {

    setMsg('');
    if (!device || !session) return setMsg('Select device and session.');
    if (!customer) return setMsg('Pick a customer.');
    if (lines.length === 0) return setMsg('Add at least one product line.');
    for (const l of lines) {
      if (!l.batch_id || !l.store_id) return setMsg(`Select batch/store for "${l.name}"`);
    }

    // ✅ new — only complain if an exchange is actually needed
    if (extraUsdForExchange > 0) {
    if (dualTenderOverpay) {
        return setMsg('Overpaid with both USD & SOS. Adjust amounts to match total (exchange not available).');
    }
    if (!exchangeAccepted) {
        return setMsg('Select exchange to continue.');
    }
    }

    // Build payments to send (after trimming overpay if any)
    let sendUSD = usdCeil2(usdAmount || 0);
    let sendSOS = sosInt(sosNative || 0);

        // ✅ new — mirror the UI logic
        if (exchangeAccepted && extraUsdForExchange > 0) {
        const singleUSD = hasUSD && !hasSOS;
        const singleSOS = hasSOS && !hasUSD;

        if (singleUSD) {
            // customer handed extra USD: reduce the USD we send
            sendUSD = Math.max(0, usdCeil2(sendUSD - extraUsdForExchange));
        } else if (singleSOS) {
            // customer handed extra SOS: reduce the SOS we send
            const reduceSOS = sosInt(extraUsdForExchange * (SALE_RATE));
            sendSOS = Math.max(0, sendSOS - reduceSOS);
        }
        // if both tenders, we never reach here because we blocked above
        }


    const payments: any[] = [];
    if (sendUSD > 0) payments.push({ method: 'CASH_USD', amount_usd: usdCeil2(sendUSD) });
    if (sendSOS > 0) payments.push({ method: 'CASH_SOS', amount_native: sosInt(sendSOS), rate_used: SALE_RATE });

    // around line ~150 inside submit(), right before building the request payload
const paidUsdEqSubmit = usdCeil2(usdCeil2(usdAmount || 0) + usdCeil2((sosInt(sosNative || 0)) / (SALE_RATE)));
const remainingUsdSubmit = usdCeil2(Math.max(0, totalUsd - paidUsdEqSubmit));
const remainingSOSRawSubmit = sosInt(remainingUsdSubmit * (SALE_RATE));

const roundedDownSOSSubmit  = roundSOS1000(remainingSOSRawSubmit, 'down');
const roundedUpSOSSubmit    = roundSOS1000(remainingSOSRawSubmit, 'up');
const autoNearestSOSSubmit  = roundSOS1000(remainingSOSRawSubmit, 'nearest');

const chosenRoundedSOSSubmit = roundSOSMode === 'auto'
  ? autoNearestSOSSubmit
  : (roundSOSMode === 'up' ? roundedUpSOSSubmit : roundedDownSOSSubmit);

const roundingDiffNativeSubmit = calcRoundingDiff(remainingSOSRawSubmit, chosenRoundedSOSSubmit); // >0 gain, <0 loss
const roundingDirectionSubmit  = roundingDiffNativeSubmit > 0 ? 'GAIN' : (roundingDiffNativeSubmit < 0 ? 'LOSS' : 'NONE');
// --- build rounding audit for backend -------------------------------
// what the cashier should ask for in SOS given the USD part only
const targetRaw = neededSOSRawBeforeSOS;   // e.g. 19,710
const targetRounded = neededTargetSOS;     // e.g. 20,000 (up/down/auto result)
const targetDiff = targetRounded - targetRaw; // + => GAIN, - => LOSS
const targetDirection = targetDiff > 0 ? 'GAIN' : (targetDiff < 0 ? 'LOSS' : 'NONE');

// what was actually paid in SOS on this sale (for context)
const sosPaidSubmit = sosInt(sosNative || 0);

// optional: keep the "remaining" view for transparency (will be zero when fully paid)
const remainingRaw = remainingSOSRawSubmit;          // from your existing submit computations
const remainingRounded = chosenRoundedSOSSubmit;     // from your existing submit computations
const remainingDiff = remainingRounded - remainingRaw;
const remainingDirection = remainingDiff > 0 ? 'GAIN' : (remainingDiff < 0 ? 'LOSS' : 'NONE');
//......................................................................
    const willExchangeOverage =
  exchangeAccepted &&
   extraUsdForExchange > 0 &&
   (hasSOS && !hasUSD);

   const roundingMeta = willExchangeOverage
   // 👉 During exchange: force backend to use pm.amount_native by
   // omitting chosen/base/paid fields that would override it.
   ? {
       mode: roundSOSMode,
       rate_used: SALE_RATE,
       // leave ONLY informational deltas if you want
       paid_over_target_native: Math.max(0, sosPaidSubmit - neededTargetSOS),
       paid_under_target_native: Math.max(0, neededTargetSOS - sosPaidSubmit),
       // (optional) you can keep an audit-only shadow; backend ignores it:
       // audit_target_native: neededTargetSOS,
     }
   // Normal (no exchange): keep your rounding hints
   : {
       mode: roundSOSMode,
       rate_used: SALE_RATE,
       base_needed_native: targetRaw,
       chosen_target_native: neededTargetSOS,
       diff_native: Math.abs(targetDiff),
       direction: targetDirection,
       paid_native: sosPaidSubmit, // optional
       paid_over_target_native: Math.max(0, sosPaidSubmit - neededTargetSOS),
       paid_under_target_native: Math.max(0, neededTargetSOS - sosPaidSubmit),
       base_remaining_native: remainingRaw,
       chosen_remaining_native: remainingRounded,
       diff_remaining_native: Math.abs(remainingDiff),
       direction_remaining: remainingDirection,
     };
// --------------------------------------------------------------------



    setBusy(true);
    try {
      const saleRes = await api.postSale({
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
        rounding_meta: roundingMeta,

      });
const saleId = saleRes?.sale?.id ?? saleRes?.id;      // ✅ correct
const custId = customer?.id ?? undefined;

console.log('[DEBUG] Sale/Exchange linkage →', { saleId, custId });


// ✅ new — same gate/amount as UI
if (exchangeAccepted && extraUsdForExchange > 0) {
  const singleUSD = hasUSD && !hasSOS;
  const singleSOS = hasSOS && !hasUSD;

  if (singleUSD || singleSOS) {
    // Build rounding meta ONLY for USD→SOS (that’s where the SOS rounding applies)
    const exchangeRoundingMeta =
      exDir === 'USD2SOS'
        ? {
            mode: exRoundMode,
            rate_used: exRateForUI,           // 27,000
            base_needed_native: exRawNative,  // raw SOS from extra USD
            chosen_target_native: exChosenNative,
            diff_native: Math.abs(exDiffNative),
            direction: exDiffNative > 0 ? 'LOSS' : (exDiffNative < 0 ? 'GAIN' : 'NONE'),
            
          }
        : undefined;

    try {
      await postExchangeForExtra(
        API_BASE,
        extraUsdForExchange,                           // still pass USD
        singleUSD ? 'USD2SOS' : 'SOS2USD',
        rate,
        AUTH,
        exchangeRoundingMeta,                          // only for USD→SOS
        saleId,                                        // NEW
        custId                     // NEW
      );
    } catch (exErr: any) {
      // Sale is already saved; let the cashier know exchange failed
      Alert.alert('Sale saved, exchange failed', exErr?.message || 'Please record the exchange manually.');
    }
  }
}


      Alert.alert(
  '✅ Sale created',
  exchangeAccepted && extraUsdForExchange > 0
    ? 'Change recorded via exchange.'
    : 'OK'
);

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
    usdAmount, sosNative, exchangeAccepted,
  singleTenderOverpay, dualTenderOverpay, hasUSD, hasSOS, SALE_RATE, rate, totalUsd,
  roundSOSMode, extraUsdForExchange
  ]);

  /** ---------- Overlay open/close ---------- */
  const openProductSearch = useCallback(() => { setSearchOverlayOpen(prev => (prev ? prev : true)); }, []);
  const closeProductSearch = useCallback(() => { setSearchOverlayOpen(prev => (prev ? false : prev)); Keyboard.dismiss(); }, []);
  const openCustomerSearch = useCallback(() => { setCustomerOverlayOpen(prev => (prev ? prev : true)); }, []);
  const closeCustomerSearch = useCallback(() => { setCustomerOverlayOpen(prev => (prev ? false : prev)); Keyboard.dismiss(); }, []);

  // around line ~260 (right before the return or near your submitDisabled/activeSubtotal etc.)
const paidUsdEqNow = usdCeil2(usdCeil2(usdAmount || 0) + usdCeil2((sosInt(sosNative || 0)) / (SALE_RATE)));
const remainingUsdNow = usdCeil2(Math.max(0, totalUsd - paidUsdEqNow));
const remainingSOSRaw = sosInt(remainingUsdNow * (SALE_RATE)); // unrounded native

const roundedDownSOS  = roundSOS1000(remainingSOSRaw, 'down');
const roundedUpSOS    = roundSOS1000(remainingSOSRaw, 'up');
const autoNearestSOS  = roundSOS1000(remainingSOSRaw, 'nearest');

const chosenRoundedSOS = roundSOSMode === 'auto'
  ? autoNearestSOS
  : (roundSOSMode === 'up' ? roundedUpSOS : roundedDownSOS);

const roundingDiffNative = calcRoundingDiff(remainingSOSRaw, chosenRoundedSOS); // positive = GAIN, negative = LOSS
const roundingDirection  = roundingDiffNative > 0 ? 'GAIN' : (roundingDiffNative < 0 ? 'LOSS' : 'NONE');




/////////////////////////////////
// put this above your return(), e.g. after other callbacks
const onTapRemainingSOS = useCallback(() => {
  // reset SOS cash input
  setSosNative('0');

  // (optional) also clear prior exchange acceptance, since amounts changed
  setExchangeAccepted(false);

  // keep your existing toggle behavior
  setRoundSOSMode(prev => {
    if (prev === 'auto') {
      const nearestIsDown = autoNearestSOS === roundedDownSOS && autoNearestSOS !== roundedUpSOS;
      return nearestIsDown ? 'up' : 'down';
    }
    return prev === 'up' ? 'down' : 'up';
  });
}, [autoNearestSOS, roundedDownSOS, roundedUpSOS]);

////////////////////


  /** ---------- Alpha top-5 helpers ---------- */
  const fetchProductsAlphaTop5 = useCallback(async (): Promise<Product[]> => {
    const broad = await api.getProducts('a');
    return [...broad].sort((a, b) => (a.name || '').localeCompare(b.name || '')).slice(0, 5);
  }, []);

  const fetchCustomersAlphaTop5 = useCallback(async (): Promise<Customer[]> => {
    const rows = await fetchCustomers('a');
    return [...rows].sort((a, b) => (a.name || '').localeCompare(b.name || '')).slice(0, 5);
  }, [fetchCustomers]);

  /** ---------- UI ---------- */
const submitDisabled = busy || exchangeNeeded || SALE_RATE === 0;

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

              {/* Customer */}
              <Text style={s.label}>Customer</Text>
              <TouchableOpacity style={s.select} onPress={openCustomerSearch}>
                <Text style={s.selectText}>
                  {customer ? customer.name : 'Select customer…'}
                </Text>
                {customer?.phone ? <Text style={{ color: '#666', marginTop: 4 }}>{customer.phone}</Text> : null}
              </TouchableOpacity>

              {/* Search + Scan */}
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

              {/* Lines grid */}
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
                  Using Accounting rate: <Text style={{ fontWeight: '800' }}>{SALE_RATE}</Text>  →  USD eq: <Text style={{ fontWeight: '800' }}>
                    {usdCeil2((sosInt(sosNative||0)) / (SALE_RATE)).toFixed(2)}
                  </Text>
                </Text>
              </View>

              {/* Totals */}
              <View style={{ marginTop: 12 }}>
                <Text>
                  Total USD: <Text style={{ fontWeight: '800' }}>{totalUsd.toFixed(2)}</Text>
                  {'   '}Total SOS: <Text style={{ fontWeight: '800' }}>{sosInt(totalUsd * (SALE_RATE )).toLocaleString()}</Text>
                </Text>
                <Text style={{ marginTop: 4 }}>
                  Paid USD: <Text style={{ fontWeight: '800' }}>{usdCeil2(usdCeil2(usdAmount || 0) + usdCeil2((sosInt(sosNative||0)) / (SALE_RATE ))).toFixed(2)}</Text>
                  {'   '}Paid SOS(eq): <Text style={{ fontWeight: '800' }}>{sosInt(usdCeil2(usdCeil2(usdAmount || 0) + usdCeil2((sosInt(sosNative||0)) / (SALE_RATE ))) * (SALE_RATE )).toLocaleString()}</Text>
                </Text>
<Text style={{ marginTop: 4, fontWeight: '800' }}>
  Remaining USD: {usdCeil2(Math.max(0, totalUsd - usdCeil2(usdCeil2(usdAmount || 0) + usdCeil2((sosInt(sosNative||0)) / (SALE_RATE ))))).toFixed(2)}
  {'   '}|   Remaining SOS: 
</Text>

<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
  <TouchableOpacity
    onPress={onTapRemainingSOS}
    style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f1f1f1' }}
  >
    <Text>
      {chosenRoundedSOS.toLocaleString()}
      {'  '}
      <Text style={{ color: '#666', fontSize: 12 }}>
        ({roundSOSMode === 'auto' ? 'auto' : roundSOSMode})
      </Text>
    </Text>
  </TouchableOpacity>

  {/* Show raw for transparency */}
  <Text style={{ marginLeft: 8, color: '#666' }}>
    raw {remainingSOSRaw.toLocaleString()}
  </Text>

  {roundingDiffNative !== 0 ? (
    <Text style={{ marginLeft: 8, color: roundingDiffNative > 0 ? 'green' : 'red' }}>
      {roundingDiffNative > 0 ? `+${roundingDiffNative.toLocaleString()}` : `${roundingDiffNative.toLocaleString()}`}
    </Text>
  ) : null}
</View>

              </View>

              {/* Exchange block */}
                <ExchangeBlock
                extraUsd={extraUsdForExchange}
                dualTenderOverpay={dualTenderOverpay && extraUsdForExchange > 0}
                hasUSD={hasUSD}
                hasSOS={hasSOS}
                rate={rate}                    // keep full rate object
                dir={exDir}                    // NEW
                uiRate={exRateForUI}           // NEW (27000 for USD→SOS, 28000 for SOS→USD)
                exRoundMode={exRoundMode}      // NEW
                onToggleRound={onTapExchangeRounding} // NEW
                exRawNative={exRawNative}      // NEW
                exChosenNative={exChosenNative}// NEW
                exDiffNative={exDiffNative}    // NEW
                totalUsd={totalUsd}
                paidUsdEq={usdCeil2(usdCeil2(usdAmount || 0) + usdCeil2((sosInt(sosNative||0)) / (SALE_RATE)))}
                exchangeAccepted={exchangeAccepted}
                onAccept={() => setExchangeAccepted(true)}
                />

            </View>
          }
ListFooterComponent={
  <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
    <View style={s.totals}>
      <Text style={s.totalText}>Total (USD): {totalUsd.toFixed(2)}</Text>
    </View>

    <TouchableOpacity
      style={[s.submit, submitDisabled && { opacity: 0.5 }]}
      disabled={submitDisabled}
      onPress={submit}
    >
      <Text style={s.submitText}>
        {busy ? 'Saving…' : exchangeNeeded ? 'Select exchange to continue' : 'Create Sale'}
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

        {/* Product search overlay */}
        <ProductOverlay
          visible={searchOverlayOpen}
          onClose={closeProductSearch}
          onAdd={async (item) => { await addLineAndGetNewQty(item); closeProductSearch(); }}
          fetchAlphaTop5={async () => {
            const broad = await api.getProducts('a');
            return [...broad].sort((a, b) => (a.name || '').localeCompare(b.name || '')).slice(0, 5);
          }}
          search={(q) => api.getProducts(q)}
          getOnHand={async (pid) => {
            try {
              const lots = await api.getLots(pid);
              return lots.reduce((s, l) => s + Number(l.on_hand || 0), 0);
            } catch { return undefined; }
          }}
        />

        {/* Customer search overlay */}
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

  empty: { textAlign: 'center', color: '#777', marginTop: 12 },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },

  // ...inside const s = StyleSheet.create({ ... })
payRow: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 12, marginTop: 8 },
tagBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
tagTxt: { color: '#fff', fontWeight: '800' },
});
