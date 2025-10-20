import React, { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Card, Divider, ListItem, Tag, SegmentedControl } from '@/src/components';
import { useTheme, text, space } from '@/src/theme';

type Alerts = {
  low_stock: any[];
  expiries: any[];
  receivables: any[];
  slow_movers: any[];
  returns_voids: any[];
};

export default function AlertsPanel({ alerts }: { alerts: Alerts }) {
  const { theme: t } = useTheme();
  const [tab, setTab] = useState<'low'|'exp'|'ar'|'slow'|'rv'>('low');

  const data = useMemo(() => {
    switch (tab) {
      case 'low':  return { title: 'Low Stock', rows: alerts.low_stock, empty: 'No low stock items.' };
      case 'exp':  return { title: 'Expiries', rows: alerts.expiries, empty: 'No expiries in window.' };
      case 'ar':   return { title: 'Receivables', rows: alerts.receivables, empty: 'No open receivables.' };
      case 'slow': return { title: 'Slow Movers', rows: alerts.slow_movers, empty: 'No slow movers.' };
      case 'rv':   return { title: 'Returns & Voids', rows: alerts.returns_voids, empty: 'No returns/voids.' };
    }
  }, [tab, alerts]);

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={text('h3', t.colors.textPrimary)}>{data.title}</Text>
        <SegmentedControl
          value={tab}
          onChange={v => setTab(v as any)}
          segments={[
            { value: 'low',  label: 'Low' },
            { value: 'exp',  label: 'Expiries' },
            { value: 'ar',   label: 'AR' },
            { value: 'slow', label: 'Slow' },
            { value: 'rv',   label: 'R&V' },
          ]}
        />
      </View>

      <View style={{ height: space.xs }} />
      {!data.rows?.length ? (
        <Text style={text('bodySm', t.colors.textSecondary)}>{data.empty}</Text>
      ) : (
        <View style={{ gap: space.xs }}>
          {data.rows.map((r: any, i: number) => (
            <React.Fragment key={i}>
              <AlertRow tab={tab} row={r} />
              {i < data.rows.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}
        </View>
      )}
    </Card>
  );
}

function AlertRow({ tab, row }: { tab: string; row: any }) {
  switch (tab) {
    case 'low':
      return <ListItem title={row.name} subtitle={`SKU ${row.sku}`} meta={`On hand: ${row.on_hand} • RP: ${row.reorder_point}`} />;
    case 'exp':
      return <ListItem title={row.product?.name || row.product_id} subtitle={`Batch ${row.batch_id}`} meta={`${new Date(row.expiry_date).toLocaleDateString()} • On hand: ${row.on_hand}`} />;
    case 'ar':
      return <ListItem title={row.customer || '—'} subtitle={row.invoice_id} meta={`$${(row.balance_usd || 0).toFixed(2)}`} />;
    case 'slow':
      return <ListItem title={row.name} subtitle={`SKU ${row.sku}`} meta={`OH ${row.on_hand} • Sold ${row.sold_last_window}`} />;
    case 'rv':
      return <ListItem title={row.type} subtitle={new Date(row.date).toLocaleString()} meta={`$${(row.amount_usd || 0).toFixed(2)}`} />;
    default:
      return <ListItem title="—" />;
  }
}
