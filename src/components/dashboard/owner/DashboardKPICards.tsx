import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, text, space, elevation, radius } from '@/src/theme';
import { Card, Tag } from '@/src/components';

const fmt = (n?: number) =>
  typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
const money = (n?: number) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '—');

export default function DashboardKPICards({ kpis }: { kpis: any }) {
  const { theme: t } = useTheme();
  if (!kpis) return null;

  // sales delta
  const delta = kpis?.sales?.pct_change_vs_yesterday ?? 0;
  const deltaTone = delta > 0 ? 'success' : delta < 0 ? 'danger' : 'neutral';
  const deltaPct = `${(delta * 100).toFixed(0)}%`;
  const DeltaIcon =
    delta > 0 ? (
      <Ionicons name="trending-up-outline" size={14} color={t.colors.success.base as string} />
    ) : delta < 0 ? (
      <Ionicons name="trending-down-outline" size={14} color={t.colors.danger.base as string} />
    ) : (
      <Ionicons name="remove-outline" size={14} color={t.colors.textSecondary as string} />
    );

  const Pill = ({
    label,
    value,
    icon,
    meta,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    meta?: React.ReactNode;
  }) => (
    <View style={[{ flex: 1, minWidth: 160 }, elevation[1]]}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Icon bubble */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.surface2,
            }}
          >
            {icon}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={text('label', t.colors.textSecondary)} numberOfLines={1}>
              {label}
            </Text>
            <View style={{ height: 2 }} />
            <Text style={text('h2', t.colors.textPrimary)} numberOfLines={1}>
              {value}
            </Text>
          </View>

          {/* Optional meta at right (e.g., delta tag) */}
          {meta ? <View style={{ marginLeft: space.xs }}>{meta}</View> : null}
        </View>
      </Card>
    </View>
  );

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <Pill
        label="Sales Today"
        value={money(kpis?.sales?.today)}
        icon={<Ionicons name="cash-outline" size={18} color={t.colors.primary.base as string} />}
        meta={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {DeltaIcon}
            <Tag label={deltaPct} tone={deltaTone as any} />
          </View>
        }
      />

      <Pill
        label="Transactions"
        value={fmt(kpis?.transactions?.today)}
        icon={<Ionicons name="receipt-outline" size={18} color={t.colors.textSecondary as string} />}
      />

      <Pill
        label="Avg Ticket"
        value={money(kpis?.avg_ticket?.today)}
        icon={<MaterialCommunityIcons name="ticket-percent-outline" size={18} color={t.colors.textSecondary as string} />}
      />

      <Pill
        label="Receivables"
        value={`${fmt(kpis?.receivables?.open_invoices)} open`}
        icon={<Ionicons name="people-outline" size={18} color={t.colors.textSecondary as string} />}
        meta={
          <Text style={text('bodySm', t.colors.textSecondary)}>
            {money(kpis?.receivables?.balance_usd)}
          </Text>
        }
      />

      <Pill
        label="Payables"
        value={`${fmt(kpis?.payables?.open_bills)} open`}
        icon={<Ionicons name="card-outline" size={18} color={t.colors.textSecondary as string} />}
        meta={
          <Text style={text('bodySm', t.colors.textSecondary)}>
            {money(kpis?.payables?.balance_usd)}
          </Text>
        }
      />

      <Pill
        label="Low Stock"
        value={fmt(kpis?.low_stock_count)}
        icon={<MaterialCommunityIcons name="cube-outline" size={18} color={t.colors.warning.base as string} />}
      />

      {/* Full-width Cash Session card */}
      <View style={{ flexBasis: '100%' }} />
      <CashSessionCard session={kpis?.cash_session} />
    </View>
  );
}

function CashSessionCard({ session }: { session: any }) {
  const { theme: t } = useTheme();
  const status = session?.status || '—';
  const isOpen = status === 'OPEN';

  const statusTone = isOpen ? 'success' : 'neutral';
  const statusIcon = isOpen ? (
    <Ionicons name="lock-open-outline" size={16} color={t.colors.success.base as string} />
  ) : (
    <Ionicons name="lock-closed-outline" size={16} color={t.colors.textSecondary as string} />
  );

  return (
    <View style={{ flex: 1, minWidth: 320 }}>
      <Card>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.surface2,
              }}
            >
              <Ionicons name="cash-outline" size={18} color={t.colors.textPrimary as string} />
            </View>
            <Text style={text('h3', t.colors.textPrimary)}>Cash Session</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {statusIcon}
            <Tag tone={statusTone as any} label={status} />
          </View>
        </View>

        <View style={{ height: space.xs }} />
        <Text style={text('bodySm', t.colors.textSecondary)}>
          Opened: {session?.opened_at ? new Date(session.opened_at).toLocaleString() : '—'}
        </Text>
        <Text style={text('bodySm', t.colors.textSecondary)}>Cashier: {session?.cashier || '—'}</Text>

        <View style={{ height: space.sm }} />

        {/* Amount chips */}
        <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
          <Amount
            label="Opening Float"
            value={session?.opening_float_usd}
            icon={<Ionicons name="wallet-outline" size={14} color={t.colors.textSecondary as string} />}
          />
          <Amount
            label="Expected"
            value={session?.expected_usd}
            icon={<Ionicons name="speedometer-outline" size={14} color={t.colors.textSecondary as string} />}
          />
          <Amount
            label="Counted"
            value={session?.counted_usd}
            icon={<Ionicons name="checkmark-done-outline" size={14} color={t.colors.textSecondary as string} />}
          />
        </View>
      </Card>
    </View>
  );
}

function Amount({
  label,
  value,
  icon,
}: {
  label: string;
  value?: number;
  icon?: React.ReactNode;
}) {
  const { theme: t } = useTheme();
  return (
    <View
      style={{
        paddingVertical: space.xs,
        paddingHorizontal: space.sm,
        borderRadius: radius.sm,
        backgroundColor: t.colors.surface3,
        minWidth: 120,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={text('caption', t.colors.textSecondary)}>{label}</Text>
      </View>
      <View style={{ height: 2 }} />
      <Text style={text('label', t.colors.textPrimary)}>${(value ?? 0).toFixed(2)}</Text>
    </View>
  );
}