import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useTheme, text, space, radius, elevation } from '@/src/theme';

export type ReceiptLine = {
  id: string;
  name: string;
  qty: number;
  unit?: string | null;
  unit_price_usd: number;
  discount_usd?: number;
  total_usd: number;
  meta?: string | null;
};

export type ReceiptPayment = {
  method: string;           // e.g. CASH_USD, CASH_SOS, CARD
  amount_usd: number;
  fx_note?: string | null;  // e.g. “SOS 27,000 @ 28,000”
};

export type ReceiptInfo = {
  receipt_no: string;
  date_iso: string;
  shop_name: string;
  shop_address?: string;
  cashier?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  subtotal_usd: number;
  tax_usd?: number;
  discount_usd?: number;
  rounding_usd?: number;
  total_usd: number;
  change_usd?: number;
  payments: ReceiptPayment[];
  lines: ReceiptLine[];
  footer_note?: string;
};

export function ReceiptViewer({
  visible,
  onClose,
  receipt,
  onPrint,
  onShare,
}: {
  visible: boolean;
  onClose: () => void;
  receipt: ReceiptInfo;
  onPrint?: () => void;
  onShare?: () => void;
}) {
  const { theme: t } = useTheme();

  const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <View style={styles.kv}>
      <Text style={text('label', t.colors.textSecondary)}>{k}</Text>
      <Text style={text(strong ? 'bodyLg' : 'body', strong ? t.colors.textPrimary : t.colors.textPrimary)}>{v}</Text>
    </View>
  );

  const LineRow = ({ item }: { item: ReceiptLine }) => (
    <View style={styles.lineRow}>
      <View style={{ flex: 1 }}>
        <Text style={text('body', t.colors.textPrimary)} numberOfLines={1}>{item.name}</Text>
        <Text style={text('caption', t.colors.textSecondary)}>
          {item.qty} {item.unit ?? ''} × ${item.unit_price_usd.toFixed(2)}
          {item.discount_usd ? `  (−$${item.discount_usd.toFixed(2)})` : ''}
        </Text>
        {item.meta ? <Text style={text('caption', t.colors.textSecondary)}>{item.meta}</Text> : null}
      </View>
      <Text style={text('body', t.colors.textPrimary)}>${item.total_usd.toFixed(2)}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
        {/* Header actions */}
        <View style={[styles.header, { backgroundColor: t.colors.surface, borderBottomColor: t.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={[styles.hBtn, { borderColor: t.colors.border }]}>
            <Text style={text('label', t.colors.textPrimary)}>Close</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {onShare ? (
              <TouchableOpacity onPress={onShare} style={[styles.hBtn, { backgroundColor: t.colors.secondary.base }]}>
                <Text style={text('label', t.colors.secondary.onBase)}>Share</Text>
              </TouchableOpacity>
            ) : null}
            {onPrint ? (
              <TouchableOpacity onPress={onPrint} style={[styles.hBtn, { backgroundColor: t.colors.primary.base }]}>
                <Text style={text('label', t.colors.primary.onBase)}>Print</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Body */}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.paper, elevation[1], { backgroundColor: t.colors.surface3, borderColor: t.colors.border }]}>
            {/* Shop */}
            <View style={{ alignItems: 'center', marginBottom: space.sm }}>
              <Text style={text('h3', t.colors.textPrimary)}>{receipt.shop_name}</Text>
              {receipt.shop_address ? <Text style={text('caption', t.colors.textSecondary)}>{receipt.shop_address}</Text> : null}
            </View>

            {/* Header meta */}
            <Row k="Receipt #" v={receipt.receipt_no} />
            <Row k="Date" v={receipt.date_iso.replace('T', ' ').slice(0, 19)} />
            {receipt.cashier ? <Row k="Cashier" v={receipt.cashier} /> : null}
            {receipt.customer_name ? <Row k="Customer" v={receipt.customer_name} /> : null}
            {receipt.customer_phone ? <Row k="Phone" v={receipt.customer_phone} /> : null}

            {/* Lines */}
            <View style={[styles.sep, { backgroundColor: t.colors.border }]} />
            <FlatList
              data={receipt.lines}
              keyExtractor={(l) => l.id}
              renderItem={LineRow}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
            <View style={[styles.sep, { backgroundColor: t.colors.border, marginTop: space.sm }]} />

            {/* Totals */}
            <Row k="Subtotal" v={`$${receipt.subtotal_usd.toFixed(2)}`} />
            {receipt.tax_usd ? <Row k="Tax" v={`$${receipt.tax_usd.toFixed(2)}`} /> : null}
            {receipt.discount_usd ? <Row k="Discount" v={`−$${receipt.discount_usd.toFixed(2)}`} /> : null}
            {typeof receipt.rounding_usd === 'number' ? <Row k="Rounding" v={`$${receipt.rounding_usd.toFixed(2)}`} /> : null}
            <View style={[styles.sep, { backgroundColor: t.colors.border }]} />
            <Row k="Total" v={`$${receipt.total_usd.toFixed(2)}`} strong />
            {typeof receipt.change_usd === 'number' ? <Row k="Change" v={`$${receipt.change_usd.toFixed(2)}`} /> : null}

            {/* Payments */}
            <View style={[styles.sep, { backgroundColor: t.colors.border }]} />
            <Text style={[text('label', t.colors.textSecondary), { marginBottom: 6 }]}>Payments</Text>
            {receipt.payments.map((p, idx) => (
              <View key={idx} style={styles.kv}>
                <Text style={text('body', t.colors.textPrimary)}>{p.method}</Text>
                <Text style={text('body', t.colors.textPrimary)}>${p.amount_usd.toFixed(2)}</Text>
              </View>
            ))}
            {receipt.footer_note ? (
              <>
                <View style={[styles.sep, { backgroundColor: t.colors.border }]} />
                <Text style={[text('caption', t.colors.textSecondary), { textAlign: 'center' }]}>{receipt.footer_note}</Text>
              </>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { padding: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  paper: { borderWidth: 1, borderRadius: 12, padding: 12 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sep: { height: 1, marginVertical: 8, opacity: 0.8 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
