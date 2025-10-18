import React, { useMemo, useState } from 'react';
import { FlatList, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTheme, text, space, layout, radius, elevation } from '@/src/theme';
import { Button } from '@/src/components'; // wherever your real Button is exported from


// POS-only components (barrel)
import {
  AmountKeypad,
  CartLineItem,
  ChangeDuePanel,
  ConfirmDialog,
  CustomerSelector,
  Discount,
  EmptyState,
  FXBadge,
  JournalLinesViewer,
  MoneyInput,
  PINPad,
  ShiftOpenClose,
  SkeletonRow,
  SplitTender,
  TotalsRibbon,
  ReceiptViewer,
  ProductSearchModal,
  HoldOrderList,
} from '@/src/components/for_pos_only';

// --- mock data helpers -------------------------------------------------------
const mockCart = [
  { id: 'l1', name: 'Coca Cola 330ml', qty: 2, unit_price_usd: 0.99, total_usd: 1.98, sku: 'COLA330' },
  { id: 'l2', name: 'Chocolate Bar', qty: 1, unit_price_usd: 2.50, total_usd: 2.50, sku: 'CHOCO01' },
];

const mockReceipt = {
  receipt_no: 'RCP-2025-00042',
  date_iso: new Date().toISOString(),
  shop_name: 'Blue Mint Market',
  shop_address: 'KM4, Mogadishu',
  cashier: 'Asha',
  customer_name: 'Walk-in',
  subtotal_usd: 4.48,
  total_usd: 4.48,
  payments: [{ method: 'CASH_USD', amount_usd: 5 }],
  change_usd: 0.52,
  lines: mockCart.map(x => ({
    id: x.id,
    name: x.name,
    qty: x.qty,
    unit_price_usd: x.unit_price_usd,
    total_usd: x.total_usd,
  })),
};

const heldOrders = [
  { id: 'h1', label: 'Walk-in #12', created_at: new Date().toISOString(), items_count: 3, total_usd: 5.47 },
  { id: 'h2', label: 'Table 4', created_at: new Date(Date.now() - 600000).toISOString(), items_count: 2, total_usd: 3.49 },
];


//npx eslint app/test/pos_compo.tsx --rule "local/one-primary-per-file:error"
export default function POSComponentsPreview() {

  const { theme: t, toggleLightDark, resolvedMode } = useTheme();

  // demo screen state
  const [money, setMoney] = useState('0.00');
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [discount, setDiscount] = useState<{ type: 'PCT'|'AMT'; value: number }>({ type: 'PCT', value: 10 });

  const cartTotal = useMemo(() => mockCart.reduce((s, l) => s + l.total_usd, 0), []);
  //const fx = { label: 'USD→SOS', detail: '27,000 @ 28,000', tone: 'warning' as const };

  return (
    
    <SafeAreaView

    
        edges={['top', 'bottom', 'left', 'right']}
        style={{ flex: 1, backgroundColor: t.colors.background }}
        >
      <Stack.Screen
        options={{
          title: 'POS Components',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight: () => (
            <TouchableOpacity
              onPress={toggleLightDark}
              style={[styles.headerBtn, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }]}
            >
              <Text style={text('label', t.colors.textPrimary)}>
                {resolvedMode === 'light' ? 'Dark' : 'Light'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

    <FlatList
        data={[0]}                         // dummy item — we render everything in the header
        keyExtractor={() => 'content'}
        renderItem={null as any}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ padding: layout.containerPadding, gap: space.lg }}>

        {/* MoneyInput + AmountKeypad */}
        <Section title="MoneyInput + AmountKeypad">
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <MoneyInput
              label="Amount (USD)"
              value={money}
              onChangeText={setMoney}
              onFocus={() => setKeypadOpen(true)}
              placeholder="0.00"
              {...({} as any)}
            />
            <FXBadge counterRate={27000} accountingRate={28000} />
          </View>

          {keypadOpen ? (
            <AmountKeypad
              value={money}
              onChange={setMoney}
              onDone={() => setKeypadOpen(false)}
              currencySymbol="$"
              {...({} as any)}
            />
          ) : null}
        </Section>





        {/* CartLineItem + TotalsRibbon + ChangeDuePanel */}
        <Section title="CartLineItem / TotalsRibbon / ChangeDuePanel">
          <View style={[styles.card, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }]}>
            {mockCart.map(line => (
              <CartLineItem
                key={line.id}
                item={line as any}
                onIncrement={() => {}}
                onDecrement={() => {}}
                onRemove={() => {}}
                {...({} as any)}
              />
            ))}
          </View>
          <TotalsRibbon
            subtotalUsd={cartTotal}
            discountUsd={discount.type === 'AMT' ? discount.value : (cartTotal * discount.value) / 100}
            taxUsd={0}
            totalUsd={cartTotal - (discount.type === 'AMT' ? discount.value : (cartTotal * discount.value) / 100)}
            {...({} as any)}
          />
          <ChangeDuePanel
            totalUsd={4.48}
            paidUsd={5.00}
            changeUsd={0.52}
            methods={[{ method: 'CASH_USD', amount_usd: 5 }]}
            {...({} as any)}
          />
        </Section>

        {/* Discount + SplitTender */}
        <Section title="Discount / SplitTender">
            <Discount
            value={discount.value}
            type={discount.type}
            onChange={(next: { type: 'PCT' | 'AMT'; value: number }) => setDiscount(next)}
            {...({} as any)}
            />
          <View style={{ height: space.sm }} />
          <SplitTender
            totalUsd={10.00}
            lines={[
              { method: 'CASH_USD', amount_usd: 6.00 },
              { method: 'CARD', amount_usd: 4.00 },
            ]}
            onChange={() => {}}
            {...({} as any)}
          />
        </Section>

        {/* CustomerSelector + ConfirmDialog */}
        <Section title="CustomerSelector / ConfirmDialog">
          <CustomerSelector
            value={customer}
            onPick={(c) => setCustomer(c)}
            onClear={() => setCustomer(null)}
            fetchCustomers={async (q) => [
              { id: 'c1', name: 'Ali' },
              { id: 'c2', name: 'Maryan' },
            ].filter(c => c.name.toLowerCase().includes(q.toLowerCase()))}
            {...({} as any)}
            
          />
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
            <DemoBtn label="Open Confirm" onPress={() => setConfirmOpen(true)} />
            <DemoBtn label="Open PIN" onPress={() => setPinOpen(true)} />
          </View>
        </Section>

        {/* EmptyState + SkeletonRow */}
        <Section title="EmptyState / SkeletonRow">
          <EmptyState
            title="No sales yet"
            subtitle="Create your first sale by adding products."
            actionLabel="Add product"
            onAction={() => setSearchOpen(true)}
            {...({} as any)}
          />
          <View style={[styles.card, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }]}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        </Section>

        {/* JournalLinesViewer */}
        <Section title="JournalLinesViewer">
          <JournalLinesViewer
            lines={[
              { id: 'j1', debit: 'Cash_USD', credit: 'Cash_SOS', amount_usd: 0.9643, note: 'Base (IAR)' },
              { id: 'j2', debit: 'Cash_USD', credit: 'FX_GainLoss', amount_usd: 0.0357, note: 'FX Gain' },
            ]}
            {...({} as any)}
          />
        </Section>

        {/* ShiftOpenClose */}
        <Section title="ShiftOpenClose">
          <ShiftOpenClose
            status="OPEN"
            openedAt={new Date(Date.now() - 60 * 60 * 1000).toISOString()}
            cashier="Asha"
            openingFloatUsd={50}
            onOpen={() => {}}
            onClose={() => {}}
            {...({} as any)}
          />
        </Section>

        {/* ReceiptViewer / ProductSearchModal / HoldOrderList */}
        <Section title="ReceiptViewer / ProductSearchModal / HoldOrderList">
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <DemoBtn label="Open Receipt" onPress={() => setReceiptOpen(true)} />
            <DemoBtn label="Search Products" onPress={() => setSearchOpen(true)} />
            <DemoBtn label="Held Orders" onPress={() => setHoldsOpen(true)} />
          </View>
        </Section>

        {/* Modals mounted at root */}
        <ReceiptViewer
          visible={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          receipt={mockReceipt as any}
          onPrint={() => {}}
          onShare={() => {}}
        />

        <ProductSearchModal
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
          fetchProducts={async (q) => {
            const base = [
              { id: 'p1', sku: 'COLA330', name: 'Coca Cola 330ml', unit: 'can', price_usd: 0.99 },
              { id: 'p2', sku: 'CHOCO01', name: 'Chocolate Bar', unit: 'pc', price_usd: 2.50 },
              { id: 'p3', sku: 'WATER50', name: 'Water 500ml', unit: 'bottle', price_usd: 0.50 },
            ];
            return base.filter(p =>
              p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())
            );
          }}
          onPick={() => setSearchOpen(false)}
        />

        <HoldOrderList
          visible={holdsOpen}
          onClose={() => setHoldsOpen(false)}
          orders={heldOrders}
          onResume={() => setHoldsOpen(false)}
          onDelete={() => {}}
        />

        <ConfirmDialog
          visible={confirmOpen}
          title="Void current sale?"
          message="This action cannot be undone."
          confirmLabel="Void"
          tone="danger"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          {...({} as any)}
        />
<Button title="Primary" onPress={() => {}} />
<Button title="Loading" loading onPress={() => {}} />
<Button title="Disabled" disabled onPress={() => {}} />
<Button title="Secondary" variant="secondary" onPress={() => {}} />



        <PINPad
          visible={pinOpen}
          onClose={() => setPinOpen(false)}
          onSubmit={(pin) => { console.log('PIN:', pin); setPinOpen(false); }}
          title="Manager PIN"
          {...({} as any)}
        />
          </View>
        }
      />
    </SafeAreaView>
  );
}

// --- small helpers -----------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }]}>
      <Text style={text('h3', t.colors.textPrimary)}>{title}</Text>
      <View style={{ height: space.sm }} />
      {children}
    </View>
  );
}

function DemoBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme: t } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.demoBtn, elevation[1], { backgroundColor: t.colors.primary.base, borderRadius: radius.md }]}
    >
      <Text style={text('label', t.colors.primary.onBase)}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  section: { padding: 12, borderRadius: 12, borderWidth: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 10 },
  demoBtn: { paddingHorizontal: 14, paddingVertical: 10 },
});