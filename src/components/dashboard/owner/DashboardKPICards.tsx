import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, text, space, elevation, radius } from '@/src/theme';
import { Card, Tag } from '@/src/components';

const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');
const money = (n?: number) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '—');

export default function DashboardKPICards({ kpis }: { kpis: any }) {
  const { theme: t } = useTheme();
  if (!kpis) return null;

  const delta = kpis?.sales?.pct_change_vs_yesterday ?? 0;
  const deltaTone = delta > 0 ? 'success' : delta < 0 ? 'danger' : 'neutral';
  const deltaPct = `${(delta * 100).toFixed(0)}%`;

  const Pill = ({ label, value, meta }: { label: string; value: string; meta?: React.ReactNode }) => (
    <View style={[{ flex: 1, minWidth: 150 }, elevation[1]]}>
      <Card>
        <Text style={text('label', t.colors.textPrimary)}>{label}</Text>
        <View style={{ height: space.xs }} />
        <Text style={text('h2', t.colors.textPrimary)}>{value}</Text>
        {meta ? (<View style={{ marginTop: space.xs }}>{meta}</View>) : null}
      </Card>
    </View>
  );

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <Pill
        label="Sales Today"
        value={money(kpis?.sales?.today)}
        meta={<Tag label={deltaPct} tone={deltaTone as any} />}
      />
      <Pill label="Transactions" value={fmt(kpis?.transactions?.today)} />
      <Pill label="Avg Ticket" value={money(kpis?.avg_ticket?.today)} />
      <Pill
        label="Receivables"
        value={`${fmt(kpis?.receivables?.open_invoices)} open`}
        meta={<Text style={text('bodySm', t.colors.textSecondary)}>{money(kpis?.receivables?.balance_usd)}</Text>}
      />
      <Pill
        label="Payables"
        value={`${fmt(kpis?.payables?.open_bills)} open`}
        meta={<Text style={text('bodySm', t.colors.textSecondary)}>{money(kpis?.payables?.balance_usd)}</Text>}
      />
      <Pill
        label="Low Stock"
        value={fmt(kpis?.low_stock_count)}
      />
      <View style={{ flexBasis: '100%' }} />
      <CashSessionCard session={kpis?.cash_session} />
    </View>
  );
}

function CashSessionCard({ session }: { session: any }) {
  const { theme: t } = useTheme();
  const statusTone = session?.status === 'OPEN' ? 'success' : 'neutral';
  return (
    <View style={{ flex: 1, minWidth: 320 }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={text('h3', t.colors.textPrimary)}>Cash Session</Text>
          <Tag tone={statusTone as any} label={session?.status || '—'} />
        </View>
        <View style={{ height: space.xs }} />
        <Text style={text('bodySm', t.colors.textSecondary)}>
          Opened: {session?.opened_at ? new Date(session.opened_at).toLocaleString() : '—'}
        </Text>
        <Text style={text('bodySm', t.colors.textSecondary)}>Cashier: {session?.cashier || '—'}</Text>
        <View style={{ height: space.xs }} />
        <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
          <Amount label="Opening Float" value={session?.opening_float_usd} />
          <Amount label="Expected" value={session?.expected_usd} />
          <Amount label="Counted" value={session?.counted_usd} />
        </View>
      </Card>
    </View>
  );
}

function Amount({ label, value }: { label: string; value?: number }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ paddingVertical: space.xs, paddingHorizontal: space.sm, borderRadius: radius.sm, backgroundColor: t.colors.surface3 }}>
      <Text style={text('caption', t.colors.textSecondary)}>{label}</Text>
      <Text style={text('label', t.colors.textPrimary)}>${(value ?? 0).toFixed(2)}</Text>
    </View>
  );
}
