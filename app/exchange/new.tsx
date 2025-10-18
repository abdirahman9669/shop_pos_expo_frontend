import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Dir = 'USD2SOS' | 'SOS2USD';
type Cur = 'USD' | 'SOS';
type Account = { id: string; name: string; AccountType?: { name: string } };

// ---------- utils ----------
const n = (v: any) => {
  const x = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : 0;
};
const fmt2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '0.00');
const fmt4 = (v: number) => (Number.isFinite(v) ? v.toFixed(4) : '0.0000');
const fmtSOS = (v: number) =>
  Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : '0';

function roundForApi(amount: number, cur: Cur) {
  return cur === 'USD' ? Number(amount.toFixed(4)) : Math.round(amount);
}

function AccountPicker({
  label,
  value,
  onPick,
  options,
  loading,
}: {
  label: string;
  value: Account | null;
  onPick: (a: Account) => void;
  options: Account[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.input} onPress={() => setOpen(true)}>
        <Text style={{ fontWeight: '700' }}>{value ? value.name : 'Select account…'}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: 16, gap: 10, flex: 1 }}>
            <Text style={s.title}>Pick {label.toLowerCase()}</Text>
            {loading ? (
              <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading…</Text></View>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(i) => i.id}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { onPick(item); setOpen(false); }}
                    style={s.pickRow}
                  >
                    <Text style={{ fontWeight: '700' }}>{item.name}</Text>
                    <Text style={{ color: '#666' }}>{item.AccountType?.name || ''}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#777' }}>No accounts</Text>}
              />
            )}
            <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// Round SOS to 1,000s (same rule you use elsewhere)
const roundSOS1000 = (v: number, mode: 'up'|'down'|'nearest') => {
  const k = 1000;
  if (mode === 'up')   return Math.ceil((v || 0) / k) * k;
  if (mode === 'down') return Math.floor((v || 0) / k) * k;
  // nearest (auto)
  return Math.round((v || 0) / k) * k;
};



export default function NewExchange() {
  const [exRoundMode, setExRoundMode] = useState<'auto'|'up'|'down'>('auto');
  const [dir, setDir] = useState<Dir>('USD2SOS');
  const [amountStr, setAmountStr] = useState('1');
  const [counterRateStr, setCounterRateStr] = useState('');

  const [acctRate, setAcctRate] = useState(0);
  const [sellRate, setSellRate] = useState(0); // USD→SOS (customer gets SOS per USD)
  const [buyRate, setBuyRate] = useState(0);   // SOS→USD (customer must pay SOS per USD)
  const [rateDate, setRateDate] = useState('');
  const [loadingRates, setLoadingRates] = useState(true);
  const [err, setErr] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAcc, setLoadingAcc] = useState(true);
  const [fromAcc, setFromAcc] = useState<Account | null>(null);
  const [toAcc, setToAcc] = useState<Account | null>(null);

  // ------- load rates -------
  const loadRates = useCallback(async () => {
    setLoadingRates(true);
    setErr('');
    try {
      const r = await fetch(`${API_BASE}/api/exchange-rates?limit=1`, { headers: AUTH });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      const row = (j.data ?? [])[0];
      if (row) {
        const accounting = Number(row.rate_accounting || 0);
        const sell = Number(row.rate_sell_usd_to_sos || 0);
        const buy = Number(row.rate_buy_usd_with_sos || 0);
        setAcctRate(accounting);
        setSellRate(sell);
        setBuyRate(buy);
        setRateDate(String(row.as_of_date).replace('T', ' ').slice(0, 19));
        setCounterRateStr(String(dir === 'USD2SOS' ? sell : buy));
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed to load rates');
    } finally {
      setLoadingRates(false);
    }
  }, [dir]);

  // ------- load accounts -------
  const loadAccounts = useCallback(async () => {
    setLoadingAcc(true);
    try {
      const r = await fetch(`${API_BASE}/api/accounts?limit=200`, { headers: AUTH });
      const j = await r.json();
      const list: Account[] = (j?.data ?? j ?? []).filter(
        (a: any) => a?.AccountType?.name === 'CASH_ON_HAND'
      );
      setAccounts(list);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAcc(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);
useEffect(() => {
  setExRoundMode('auto');
}, [dir, amountStr, counterRateStr, acctRate]);

  // ------- default accounts per direction -------
  useEffect(() => {
    const usd = accounts.find(a => /USD/i.test(a.name)) || accounts.find(a => a.name === 'Cash_USD') || null;
    const sos = accounts.find(a => /SOS/i.test(a.name)) || accounts.find(a => a.name === 'Cash_SOS') || null;
    if (dir === 'USD2SOS') {
      if (sellRate) setCounterRateStr(String(sellRate));
      setFromAcc(sos);  // shop pays SOS
      setToAcc(usd);    // shop receives USD
    } else {
      if (buyRate) setCounterRateStr(String(buyRate));
      setFromAcc(usd);  // shop pays USD
      setToAcc(sos);    // shop receives SOS
    }
  }, [dir, accounts, sellRate, buyRate]);

  // ------- numbers & preview -------
  const amount = useMemo(() => n(amountStr), [amountStr]);
  const counterRate = useMemo(() => n(counterRateStr), [counterRateStr]);

  type Preview = {
    // Customer pays — Shop receives (CP–SR)
    cpAmt: number; cpCur: Cur;

    // Customer receives — Shop pays (CR–SP)
    crAmt: number; crCur: Cur;

    // IAR (in accounting rate), same currency as CR–SP
    iarAmt: number; iarCur: Cur;

    // FX (USD)
    fxGainUsd: number; fxLossUsd: number;
  };

  const preview: Preview = useMemo(() => {
    const zero: Preview = {
      cpAmt: 0, cpCur: dir === 'USD2SOS' ? 'USD' : 'SOS',
      crAmt: 0, crCur: dir === 'USD2SOS' ? 'SOS' : 'USD',
      iarAmt: 0, iarCur: dir === 'USD2SOS' ? 'SOS' : 'USD',
      fxGainUsd: 0, fxLossUsd: 0,
    };
    if (!(amount > 0) || !(counterRate > 0) || !(acctRate > 0)) return zero;

    if (dir === 'USD2SOS') {
      // CP–SR: customer pays USD
      const usd_in = amount;
      // CR–SP: shop pays SOS using counter rate
      const sos_out = usd_in * counterRate;
      // IAR in SOS (same as CR–SP)
      const iarSOS = usd_in * acctRate;

      // Compare CR–SP vs IAR (SOS), convert diff to USD for P&L
      const diffSOS = sos_out - iarSOS;  // >0 loss, <0 gain (shop perspective)
      const fxGainUsd = diffSOS < 0 ? (-diffSOS) / acctRate : 0;
      const fxLossUsd = diffSOS > 0 ? ( diffSOS) / acctRate : 0;

      return {
        cpAmt: usd_in, cpCur: 'USD',
        crAmt: sos_out, crCur: 'SOS',
        iarAmt: iarSOS, iarCur: 'SOS',
        fxGainUsd, fxLossUsd,
      };
    }

    // SOS → USD
    const sos_in = amount;
    const usd_out = sos_in / counterRate; // CR–SP (USD)
    const iarUSD = sos_in / acctRate;     // IAR (USD)
    const diffUSD = usd_out - iarUSD;     // >0 loss, <0 gain

    return {
      cpAmt: sos_in, cpCur: 'SOS',
      crAmt: usd_out, crCur: 'USD',
      iarAmt: iarUSD, iarCur: 'USD',
      fxGainUsd: diffUSD < 0 ? -diffUSD : 0,
      fxLossUsd: diffUSD > 0 ?  diffUSD : 0,
    };
  }, [dir, amount, counterRate, acctRate]);

  //////////////////////rounding\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  // ----- USD→SOS rounding model for the preview & payload -----
const exRawSOS = dir === 'USD2SOS' ? (amount > 0 && counterRate > 0 ? amount * counterRate : 0) : 0;
const exRawSOSInt = Math.round(exRawSOS);

const exDownSOS = roundSOS1000(exRawSOSInt, 'down');
const exUpSOS   = roundSOS1000(exRawSOSInt, 'up');
const exAutoSOS = roundSOS1000(exRawSOSInt, 'nearest');

const exChosenSOS =
  exRoundMode === 'auto' ? exAutoSOS :
  exRoundMode === 'up'   ? exUpSOS   :
                           exDownSOS;

const exDiffSOS = exChosenSOS - exRawSOSInt;            // >0 gain, <0 loss
const exDirection = exDiffSOS > 0 ? 'LOSS' : (exDiffSOS < 0 ? 'GAIN' : 'NONE');

// handy toggler (tap the chip)
const onToggleExRounding = useCallback(() => {
  setExRoundMode(prev => {
    if (prev === 'auto') {
      // if nearest equals down (not up), flip to up first (same behavior as Sale)
      const nearestIsDown = exAutoSOS === exDownSOS && exAutoSOS !== exUpSOS;
      return nearestIsDown ? 'up' : 'down';
    }
    return prev === 'up' ? 'down' : 'up';
  });
}, [exAutoSOS, exDownSOS, exUpSOS]);

  ////////////////////////////////////////////////////

  // ------- submit to API (send ALL preview lines) -------
  const submit = useCallback(async () => {
    try {
      if (!(amount > 0)) return Alert.alert('Enter amount > 0');
      if (!(counterRate > 0)) return Alert.alert('Enter a counter rate > 0');
      if (!(acctRate > 0)) return Alert.alert('No accounting rate');

      // Build a normalized preview payload for the backend (all lines)
      const preview_lines = {
        customer_pays__shop_receives: {
          amount: roundForApi(preview.cpAmt, preview.cpCur),
          currency: preview.cpCur,
        },
        customer_receives__shop_pays: {
          amount: roundForApi(preview.crAmt, preview.crCur),
          currency: preview.crCur,
        },
        iar: {
          amount: roundForApi(preview.iarAmt, preview.iarCur),
          currency: preview.iarCur,
        },
        fx_gain_usd: Number(preview.fxGainUsd.toFixed(4)),
        fx_loss_usd: Number(preview.fxLossUsd.toFixed(4)),
      };

      const body: any = {
        from_currency: dir === 'USD2SOS' ? 'USD' : 'SOS',
        amount,
        counter_rate: counterRate,
        accounting_rate: acctRate,
        from_method: fromAcc?.name,
        to_method: toAcc?.name,

        // send all preview lines
        preview_lines,

        // optional flat copies (if backend wants direct access)
        cp_amount: preview_lines.customer_pays__shop_receives.amount,
        cp_currency: preview_lines.customer_pays__shop_receives.currency,
        cr_amount: preview_lines.customer_receives__shop_pays.amount,
        cr_currency: preview_lines.customer_receives__shop_pays.currency,
        iar_amount: preview_lines.iar.amount,
        iar_currency: preview_lines.iar.currency,
        fx_gain_usd: preview_lines.fx_gain_usd,
        fx_loss_usd: preview_lines.fx_loss_usd,
      };
      // Add the same rounding_meta contract as Sale does (only for USD→SOS)
        if (dir === 'USD2SOS') {
          body.rounding_meta = {
            mode: exRoundMode,
            rate_used: counterRate,
            base_needed_native: exRawSOSInt,     // raw SOS from amount * counterRate
            chosen_target_native: exChosenSOS,   // cashier-chosen rounded SOS
            diff_native: Math.abs(exDiffSOS),
            direction: exDirection,              // 'GAIN' | 'LOSS' | 'NONE'
          };
        }
      const r = await fetch(`${API_BASE}/api/exchange`, {
        method: 'POST', headers: AUTH, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);

        Alert.alert(
          '✅ Exchange recorded',
          (dir === 'USD2SOS'
            ? `CP–SR: ${fmt4(preview.cpAmt)} USD\n` +
              `CR–SP: ${fmtSOS(exChosenSOS)} SOS (${exRoundMode})\n` +   // 👈 rounded value
              `IAR:   ${fmtSOS(Math.round(preview.iarAmt))} SOS\n`
            : `CP–SR: ${fmtSOS(preview.cpAmt)} SOS\n` +
              `CR–SP: ${fmt4(preview.crAmt)} USD\n` +
              `IAR:   ${fmt4(preview.iarAmt)} USD\n`
          ) +
          `FX gain: ${fmt4(preview.fxGainUsd)}  •  FX loss: ${fmt4(preview.fxLossUsd)}`
        );
    } catch (e: any) {
      Alert.alert('Exchange failed', e?.message || 'Unknown error');
    }
  }, [dir, amount, counterRate, acctRate, fromAcc, toAcc, preview, exRoundMode, exRawSOSInt, exChosenSOS, exDiffSOS, exDirection]);

  // ------- helpers -------
  const renderMoney = (amt: number, cur: Cur) =>
    cur === 'USD' ? fmt4(amt) : fmtSOS(amt);
  const AmountLabel = dir === 'USD2SOS' ? 'Amount (USD)' : 'Amount (SOS)';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'New Exchange' }} />
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
            {loadingRates ? (
              <View style={s.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading rates…</Text></View>
            ) : err ? (
              <View style={s.center}>
                <Text style={{ color: '#b00020', marginBottom: 8 }}>⚠️ {err}</Text>
                <TouchableOpacity style={s.reload} onPress={loadRates}><Text style={s.reloadTxt}>Reload</Text></TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={s.h1}>Exchange</Text>

                <Text style={s.label}>Direction</Text>
                <View style={s.switchRow}>
                  <TouchableOpacity
                    style={[s.switchBtn, dir === 'USD2SOS' ? s.switchOn : s.switchOff]}
                    onPress={() => setDir('USD2SOS')}
                  ><Text style={[s.switchTxt, dir === 'USD2SOS' ? s.switchTxtOn : s.switchTxtOff]}>USD → SOS</Text></TouchableOpacity>
                  <TouchableOpacity
                    style={[s.switchBtn, dir === 'SOS2USD' ? s.switchOn : s.switchOff]}
                    onPress={() => setDir('SOS2USD')}
                  ><Text style={[s.switchTxt, dir === 'SOS2USD' ? s.switchTxtOn : s.switchTxtOff]}>SOS → USD</Text></TouchableOpacity>
                </View>

                <Text style={s.label}>{AmountLabel}</Text>
                <TextInput
                  value={amountStr}
                  onChangeText={setAmountStr}
                  keyboardType="decimal-pad"
                  placeholder={dir === 'USD2SOS' ? '0.00' : '0'}
                  style={s.input}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={s.label}>Counter rate (SOS per 1 USD)</Text>
                <TextInput
                  value={counterRateStr}
                  onChangeText={setCounterRateStr}
                  keyboardType="number-pad"
                  placeholder={dir === 'USD2SOS' ? String(sellRate || 27000) : String(buyRate || 28000)}
                  style={s.input}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <View style={s.kv}><Text style={s.k}>Accounting rate</Text><Text style={s.v}>{fmt2(acctRate)} SOS/USD</Text></View>
                <View style={s.kv}><Text style={s.k}>Rate date</Text><Text style={s.v}>{rateDate || '-'}</Text></View>

                <AccountPicker
                  key={`from-${dir}`}
                  label={`From account (${dir === 'USD2SOS' ? 'SOS' : 'USD'})`}
                  value={fromAcc}
                  onPick={setFromAcc}
                  options={accounts.filter(a => (dir === 'USD2SOS' ? /SOS/i : /USD/i).test(a.name))}
                  loading={loadingAcc}
                />
                <AccountPicker
                  key={`to-${dir}`}
                  label={`To account (${dir === 'USD2SOS' ? 'USD' : 'SOS'})`}
                  value={toAcc}
                  onPick={setToAcc}
                  options={accounts.filter(a => (dir === 'USD2SOS' ? /USD/i : /SOS/i).test(a.name))}
                  loading={loadingAcc}
                />

                {/* --------- PREVIEW --------- */}
                <View style={s.card}>
                  <Text style={s.cardTitle}>Preview</Text>

                  <View style={s.kv}>
                    <Text style={s.k}>Customer pays — Shop receives</Text>
                    <Text style={s.v}>
                      {renderMoney(preview.cpAmt, preview.cpCur)} {preview.cpCur}
                    </Text>
                  </View>

                  {/* Customer receives — Shop pays */}
                  <View style={s.kv}>
                    <Text style={s.k}>Customer receives — Shop pays</Text>
                    {dir === 'USD2SOS' ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <TouchableOpacity
                          onPress={onToggleExRounding}
                          style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f1f1f1' }}
                        >
                          <Text style={{ fontWeight: '800' }}>
                            {fmtSOS(exChosenSOS)} SOS{' '}
                            <Text style={{ color: '#666' }}>
                              ({exRoundMode === 'auto' ? 'auto' : exRoundMode})
                            </Text>
                          </Text>
                        </TouchableOpacity>
                            <Text style={{ color: '#666', marginTop: 4 }}>
                              raw {fmtSOS(exRawSOSInt)}
                              {exDiffSOS !== 0 && (
                                <Text
                                  style={{
                                    color: exDiffSOS > 0 ? '#c1121f' : '#0a7d36', // red = loss, green = gain
                                    fontWeight: '700',
                                  }}
                                >
                                  {'  '}
                                  {exDiffSOS > 0 ? '+' : ''}{fmtSOS(Math.abs(exDiffSOS))}{' '}
                                  {exDiffSOS > 0 ? 'R loss' : 'R gain'}
                                </Text>
                              )}
                            </Text>
                      </View>
                    ) : (
                      // SOS→USD: no cashier rounding, show plain USD
                      <Text style={s.v}>{fmt4(preview.crAmt)} USD</Text>
                    )}
                  </View>

                  <View style={s.kv}>
                    <Text style={s.k}>IAR (in accounting rate)</Text>
                    <Text style={s.v}>
                      {renderMoney(preview.iarAmt, preview.iarCur)} {preview.iarCur}
                    </Text>
                  </View>

                  <View style={s.kv}>
                    <Text style={s.k}>FX gain (USD)</Text>
                    <Text style={[s.v, { color: '#0a7d36' }]}>{fmt4(preview.fxGainUsd)}</Text>
                  </View>
                  <View style={s.kv}>
                    <Text style={s.k}>FX loss (USD)</Text>
                    <Text style={[s.v, { color: '#c1121f' }]}>{fmt4(preview.fxLossUsd)}</Text>
                  </View>
                </View>

                <TouchableOpacity style={s.submit} onPress={submit}>
                  <Text style={s.submitTxt}>Record Exchange</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  title: { fontWeight: '800', fontSize: 18 },
  label: { fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: '#fff' },

  switchRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  switchBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  switchOn: { backgroundColor: '#000' }, switchOff: { backgroundColor: '#efefef' },
  switchTxt: { fontWeight: '800' }, switchTxtOn: { color: '#fff' }, switchTxtOff: { color: '#333' },

  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  k: { fontWeight: '700', color: '#666' }, v: { fontWeight: '800' },

  card: { backgroundColor: '#f7f7f7', padding: 12, borderRadius: 12, marginTop: 14 },
  cardTitle: { fontWeight: '800', marginBottom: 8 },

  submit: { marginTop: 18, backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitTxt: { color: 'white', fontWeight: '800' },

  pickRow: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee' },
  closeBtn: { backgroundColor: '#000', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },

  reload: { backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  reloadTxt: { color: '#fff', fontWeight: '800' },
});