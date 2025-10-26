// app/sales/components/SaleExchangeModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView, FlatList,
} from 'react-native';
import { API_BASE, TOKEN } from '@/src/config';

type Cur = 'USD' | 'SOS';
type Dir = 'USD2SOS' | 'SOS2USD';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

type Account = { id: string; name: string; AccountType?: { name: string } };

export default function SaleExchangeModal(props: {
  visible: boolean;
  extraUsd: number;                // extra in USD-equivalent (always USD)
  rateSell: number;                // USD -> SOS
  rateBuy: number;                 // SOS -> USD
  rateAccounting: number;          // accounting rate
  onCancel: () => void;
  onConfirm: (args: {
    // “I want change in” currency the customer will receive:
    changeCurrency: Cur;           // 'USD' or 'SOS'

    // For sale adjustment:
    reduceFrom: Cur;               // which tender to reduce (USD if changeCurrency is SOS, SOS if changeCurrency is USD)
    reduceAmountInReduceCurrency: number; // the exact amount we reduce from that tender

    // Exchange payload (to POST /api/exchange)
    exchangeDir: Dir;
    exchangeAmount: number;        // “Amount” field (the input in NewExchange screen)
    counterRate: number;
    fromMethod: string | null;     // account name
    toMethod: string | null;       // account name
  }) => void;
}) {
  const { visible, extraUsd, rateSell, rateBuy, rateAccounting, onCancel, onConfirm } = props;

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAcc, setLoadingAcc] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoadingAcc(true);
      try {
        const r = await fetch(`${API_BASE}/api/accounts?limit=200`, { headers: AUTH });
        const j = await r.json();
        const list: Account[] = (j?.data ?? j ?? []).filter(
          (a: any) => a?.AccountType?.name === 'CASH_ON_HAND'
        );
        if (alive) setAccounts(list);
      } catch {
        if (alive) setAccounts([]);
      } finally {
        if (alive) setLoadingAcc(false);
      }
    };
    if (visible) run();
    return () => { alive = false; };
  }, [visible]);

  // Helpers to pick default account names
  const usdAccName = useMemo(() => {
    const usd = accounts.find(a => /USD/i.test(a.name)) || accounts.find(a => a.name === 'Cash_USD');
    return usd?.name ?? null;
  }, [accounts]);
  const sosAccName = useMemo(() => {
    const sos = accounts.find(a => /SOS/i.test(a.name)) || accounts.find(a => a.name === 'Cash_SOS');
    return sos?.name ?? null;
  }, [accounts]);

  // Option A — Give change in SOS (customer receives SOS, shop pays SOS)
  //   Exchange direction: USD2SOS
  //   Exchange amount input = extraUsd (USD)
  //   Counter rate = rateSell
  const sosChangeSOS = useMemo(() => extraUsd * (rateSell || 27000), [extraUsd, rateSell]);

  // Option B — Give change in USD (customer receives USD, shop pays USD)
  //   Exchange direction: SOS2USD
  //   Exchange amount input = sos_in such that usd_out = extraUsd -> sos_in = extraUsd * rateBuy
  //   Counter rate = rateBuy
  const usdChangeSOSin = useMemo(() => extraUsd * (rateBuy || 28000), [extraUsd, rateBuy]);

  // UI money helpers
  const fmt2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '0.00');
  const fmtSOS = (v: number) => Math.round(v).toLocaleString('en-US');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Extra detected</Text>
          <Text style={{ marginTop: 6 }}>Extra (USD): <Text style={styles.bold}>${fmt2(extraUsd)}</Text></Text>
          <Text style={{ marginTop: 2, color: '#555' }}>
            ≈ <Text style={styles.bold}>{fmtSOS(extraUsd * (rateSell || 27000))}</Text> SOS at sell rate
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How do you want to return change?</Text>
            {loadingAcc ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator /><Text style={{ marginTop: 6 }}>Loading accounts…</Text>
              </View>
            ) : (
              <>
                {/* Change in SOS */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onConfirm({
                      changeCurrency: 'SOS',
                      reduceFrom: 'USD',
                      reduceAmountInReduceCurrency: extraUsd,
                      exchangeDir: 'USD2SOS',
                      exchangeAmount: extraUsd,
                      counterRate: rateSell || 27000,
                      fromMethod: sosAccName, // shop pays SOS
                      toMethod: usdAccName,   // shop receives USD
                    });
                  }}
                >
                  <Text style={styles.optionTitle}>Give change in SOS</Text>
                  <Text style={styles.optionSub}>
                    Customer receives: {fmtSOS(sosChangeSOS)} SOS  •  Rate: {rateSell || 27000} (sell)
                  </Text>
                </TouchableOpacity>

                {/* Change in USD */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onConfirm({
                      changeCurrency: 'USD',
                      reduceFrom: 'SOS',
                      reduceAmountInReduceCurrency: extraUsd * (rateSell || 27000), // reduce from SOS tender by the equivalent (sell)
                      exchangeDir: 'SOS2USD',
                      exchangeAmount: usdChangeSOSin, // amount (SOS) input for NewExchange flow
                      counterRate: rateBuy || 28000,
                      fromMethod: usdAccName, // shop pays USD
                      toMethod: sosAccName,   // shop receives SOS
                    });
                  }}
                >
                  <Text style={styles.optionTitle}>Give change in USD</Text>
                  <Text style={styles.optionSub}>
                    Customer receives: ${fmt2(extraUsd)} USD  •  Needs {fmtSOS(usdChangeSOSin)} SOS at buy
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#666' }}>Accounting rate: {rateAccounting || 27000} SOS/USD</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 8 },
  title: { fontWeight: '800', fontSize: 18 },
  bold: { fontWeight: '800' },
  section: { marginTop: 10, gap: 8 },
  sectionTitle: { fontWeight: '800', marginBottom: 4 },
  option: { backgroundColor: '#f7f7f7', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  optionTitle: { fontWeight: '800' },
  optionSub: { color: '#555', marginTop: 4, fontWeight: '600' },
  cancelBtn: { backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
});