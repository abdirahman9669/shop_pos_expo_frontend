// src/components/dashboard/owner/AlertsPanel.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Divider, Tag, SegmentedControl } from '@/src/components';
import { useTheme, text, space, radius } from '@/src/theme';

type Alerts = {
  low_stock: any[];
  expiries: any[];
  receivables: any[];
  slow_movers: any[];
  returns_voids: any[];
};

type TabKey = 'low' | 'exp' | 'ar' | 'slow' | 'rv';

export default function AlertsPanel({ alerts }: { alerts: Alerts }) {
  const { theme: t } = useTheme();
  const [tab, setTab] = useState<TabKey>('low');

  const data = useMemo(() => {
    switch (tab) {
      case 'low':
        return { title: 'Low Stock', rows: alerts?.low_stock ?? [], empty: 'No low stock items.' };
      case 'exp':
        return { title: 'Expiries', rows: alerts?.expiries ?? [], empty: 'No expiries in window.' };
      case 'ar':
        return { title: 'Receivables', rows: alerts?.receivables ?? [], empty: 'No open receivables.' };
      case 'slow':
        return { title: 'Slow Movers', rows: alerts?.slow_movers ?? [], empty: 'No slow movers.' };
      case 'rv':
        return { title: 'Returns & Voids', rows: alerts?.returns_voids ?? [], empty: 'No returns/voids.' };
      default:
        return { title: 'Alerts', rows: [], empty: 'No alerts.' };
    }
  }, [tab, alerts]);

  const TabIcon = ({ k, size = 18 }: { k: TabKey; size?: number }) => {
    const color = t.colors.textSecondary as string;
    switch (k) {
      case 'low':  return <MaterialCommunityIcons name="cube-outline" size={size} color={color} />;
      case 'exp':  return <MaterialCommunityIcons name="calendar-alert-outline" size={size} color={color} />;
      case 'ar':   return <Ionicons name="card-outline" size={size} color={color} />;
      case 'slow': return <Ionicons name="trending-down-outline" size={size} color={color} />;
      case 'rv':   return <Ionicons name="arrow-undo-outline" size={size} color={color} />;
    }
  };

  return (
    <Card>
      {/* Header */}
      <View
  style={{
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  }}
>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
    <TabIcon k={tab} />
    <Text style={text('h3', t.colors.textPrimary)}>{data.title}</Text>
    {!!data.rows?.length && <Tag tone="neutral" label={`${data.rows.length}`} />}
  </View>

  <View style={{ flexGrow: 1, flexShrink: 1, alignItems: 'flex-end' }}>
    <SegmentedControl
      value={tab}
      onChange={(v) => setTab(v as TabKey)}
      segments={[
        { value: 'low',  label: 'Low' },
        { value: 'exp',  label: 'Expiries' },
        { value: 'ar',   label: 'AR' },
        { value: 'slow', label: 'Slow' },
        { value: 'rv',   label: 'R&V' },
      ]}
    />
  </View>
</View>

      <View style={{ height: space.xs }} />

      {/* Body */}
      {!data.rows?.length ? (
        <View style={{ alignItems: 'center', paddingVertical: space.md }}>
          <View
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: t.colors.surface2, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark-done-outline" size={20} color={t.colors.textSecondary as string} />
          </View>
          <View style={{ height: 8 }} />
          <Text style={text('bodySm', t.colors.textSecondary)}>{data.empty}</Text>
        </View>
      ) : (
        <View style={{ gap: space.xs }}>
          {data.rows.map((r: any, i: number) => (
            <React.Fragment key={`${tab}-${i}`}>
              <AlertRow tab={tab} row={r} />
              {i < data.rows.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </View>
      )}
    </Card>
  );
}

/* ----------------- Rows ----------------- */

function Chip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const { theme: t } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.sm,
        backgroundColor: t.colors.surface3,
      }}
    >
      {icon}
      <Text style={text('caption', t.colors.textSecondary)}>{children}</Text>
    </View>
  );
}

function AvatarIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  const { theme: t } = useTheme();
  return (
    <View
      style={{
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: t.colors.surface2,
      }}
    >
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

function RowShell({
  left,
  title,
  subtitle,
  right,
}: {
  left: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { theme: t } = useTheme();
  return (
    <View style={{ paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {left}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={text('body', t.colors.textPrimary)}>{title}</Text>
          {!!subtitle && (
            <View style={{ marginTop: 2 }}>
              {typeof subtitle === 'string'
                ? <Text numberOfLines={1} style={text('caption', t.colors.textSecondary)}>{subtitle}</Text>
                : subtitle}
            </View>
          )}
        </View>
        {right}
      </View>
    </View>
  );
}

function AlertRow({ tab, row }: { tab: TabKey; row: any }) {
  const { theme: t } = useTheme();

  switch (tab) {
    case 'low': {
      const name = row?.name || '—';
      const sku = row?.sku ?? '—';
      const onHand = row?.on_hand ?? 0;
      const rp = row?.reorder_point ?? 0;

      return (
        <RowShell
          left={<AvatarIcon name="cube-outline" color={t.colors.textSecondary as string} />}
          title={name}
          subtitle={
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Chip icon={<Ionicons name="barcode-outline" size={12} color={t.colors.textSecondary as string} />}>
                SKU {sku}
              </Chip>
              <Chip icon={<Ionicons name="layers-outline" size={12} color={t.colors.textSecondary as string} />}>
                On hand {onHand}
              </Chip>
              <Chip icon={<Ionicons name="download-outline" size={12} color={t.colors.textSecondary as string} />}>
                RP {rp}
              </Chip>
            </View>
          }
          right={<Tag tone={onHand <= rp ? 'danger' : 'neutral'} label={onHand <= rp ? 'Reorder' : 'OK'} />}
        />
      );
    }

    case 'exp': {
      const name = row?.product?.name || row?.product_id || '—';
      const batch = row?.batch_id ?? '—';
      const onHand = row?.on_hand ?? 0;
      const d = row?.expiry_date ? new Date(row.expiry_date) : null;
      const dateStr = d ? d.toLocaleDateString() : '—';

      return (
        <RowShell
          left={<AvatarIcon name="calendar-outline" color={t.colors.textSecondary as string} />}
          title={name}
          subtitle={
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Chip icon={<Ionicons name="pricetag-outline" size={12} color={t.colors.textSecondary as string} />}>
                Batch {batch}
              </Chip>
              <Chip icon={<Ionicons name="time-outline" size={12} color={t.colors.textSecondary as string} />}>
                {dateStr}
              </Chip>
              <Chip icon={<Ionicons name="layers-outline" size={12} color={t.colors.textSecondary as string} />}>
                On hand {onHand}
              </Chip>
            </View>
          }
          right={<Tag tone="warning" label="Expiry" />}
        />
      );
    }

    case 'ar': {
      const customer = row?.customer || '—';
      const invoice = row?.invoice_id || '—';
      const bal = Number(row?.balance_usd || 0).toFixed(2);
      return (
        <RowShell
          left={<AvatarIcon name="person-outline" color={t.colors.textSecondary as string} />}
          title={customer}
          subtitle={
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Chip icon={<Ionicons name="document-text-outline" size={12} color={t.colors.textSecondary as string} />}>
                {invoice}
              </Chip>
            </View>
          }
          right={<Tag tone="warning" label={`$${bal}`} />}
        />
      );
    }

    case 'slow': {
      const name = row?.name || '—';
      const sku = row?.sku || '—';
      const oh = row?.on_hand ?? 0;
      const sold = row?.sold_last_window ?? 0;

      return (
        <RowShell
          left={<AvatarIcon name="trending-down-outline" color={t.colors.textSecondary as string} />}
          title={name}
          subtitle={
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Chip icon={<Ionicons name="barcode-outline" size={12} color={t.colors.textSecondary as string} />}>
                SKU {sku}
              </Chip>
              <Chip icon={<Ionicons name="layers-outline" size={12} color={t.colors.textSecondary as string} />}>
                OH {oh}
              </Chip>
              <Chip icon={<Ionicons name="stats-chart-outline" size={12} color={t.colors.textSecondary as string} />}>
                Sold {sold}
              </Chip>
            </View>
          }
          right={<Tag tone="neutral" label="Slow" />}
        />
      );
    }

    case 'rv': {
      const type = row?.type || '—';
      const amount = Number(row?.amount_usd || 0).toFixed(2);
      const dateStr = row?.date ? new Date(row.date).toLocaleString() : '—';
      return (
        <RowShell
          left={<AvatarIcon name="arrow-undo-outline" color={t.colors.textSecondary as string} />}
          title={type}
          subtitle={dateStr}
          right={<Tag tone="danger" label={`$${amount}`} />}
        />
      );
    }

    default:
      return <View />;
  }
}