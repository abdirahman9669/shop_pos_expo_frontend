// app/test/ownerDhasboard.tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useOwnerDashboard } from '@/src/hooks/useOwnerDashboard';
import { useTheme, text, space, layout } from '@/src/theme';
import { Button, Card, SegmentedControl } from '@/src/components';

import DashboardKPICards from '@/src/components/dashboard/owner/DashboardKPICards';
import SalesChart from '@/src/components/dashboard/owner/SalesChart';
import TopProductsTable from '@/src/components/dashboard/owner/TopProductsTable';
import AlertsPanel from '@/src/components/dashboard/owner/AlertsPanel';
import { useCapabilities } from '@/src/hooks/useCapabilities';

export default function OwnerDashboardScreen() {
  const { theme: t, toggleLightDark, resolvedMode } = useTheme();
  const router = useRouter();
 // ✅ always call all hooks
  const { ready, can } = useCapabilities();
  
  const {
    from, to, setFrom, setTo, grain, setGrain,
    loading, error, kpis, series, topProducts, alerts,
  } = useOwnerDashboard();

  const setPreset = (days: number) => {
    setFrom(new Date(Date.now() - (days - 1) * 24 * 3600 * 1000));
    setTo(new Date());
  };

 // ✅ now use condition only for rendering
  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
        <Stack.Screen
          options={{
            title: 'Owner Dashboard',
            headerStyle: { backgroundColor: t.colors.surface },
            headerTintColor: t.colors.textPrimary,
          }}
        />
        <View style={{ padding: 20 }}>
          <Text style={text('body', t.colors.textSecondary)}>Loading capabilities…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Owner Dashboard',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight: () => (
            <Button title={resolvedMode === 'light' ? 'Light' : 'Dark'} variant="ghost" onPress={toggleLightDark} />
          ),
        }}
      />

      {/* ⬇️ Make the whole page scrollable */}
      <ScrollView
        contentContainerStyle={{
          padding: layout.containerPadding,
          gap: space.lg,
          paddingBottom: layout.containerPadding + 80, // room for FAB or iOS home indicator
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Filters bar */}
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
            <Text style={text('label', t.colors.textSecondary)}>Range:</Text>
            <SegmentedControl
              value="7d"
              onChange={(v) => {
                if (v === '7d') setPreset(7);
                if (v === '30d') setPreset(30);
                if (v === '90d') setPreset(90);
              }}
              segments={[
                { value: '7d',  label: '7d' },
                { value: '30d', label: '30d' },
                { value: '90d', label: '90d' },
              ]}
            />
            <View style={{ width: space.sm }} />
            <Text style={text('label', t.colors.textSecondary)}>Granularity:</Text>
            <SegmentedControl
              value={grain}
              onChange={(v) => setGrain(v as any)}
              segments={[
                { value: 'day',   label: 'Day' },
                { value: 'week',  label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
            />
            <View style={{ flex: 1 }} />
            <Text style={text('caption', t.colors.textSecondary)}>
              {from.toDateString()} → {to.toDateString()}
            </Text>
          </View>
        </Card>

        {/* Quick actions */}
        <Card>
          <Text style={text('h3', t.colors.textPrimary)}>Quick Actions</Text>
          <View style={{ height: space.xs }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Button title="➕ Create Product"
              onPress={() => router.push('/create-product')}
            />
            <Button title="➕ New Sale"
              variant="secondary"
              onPress={() => router.push('/sales/screens/NewSale')}
            />
            {can('purchases:new') && (
              <Button title="➕ Purchase" variant="ghost" onPress={() => router.push('/purchase-new')} />
            )}
          </View>
        </Card>

        {/* Loading / Error / Content */}
        {loading ? (
          <Text style={text('body', t.colors.textSecondary)}>Loading…</Text>
        ) : error ? (
          <Text style={text('body', t.colors.danger.base)}>Error: {error}</Text>
        ) : (
          <>
            {/* KPI Strip */}
            <DashboardKPICards kpis={kpis} />

            {/* Chart + Top products (give the chart a fixed height so it's fully visible) */}
            <View style={{ gap: space.sm }}>
              <Card>
                <Text style={text('h2', t.colors.textPrimary)}>Sales</Text>
                <View style={{ height: space.sm }} />
                {/* If your SalesChart supports a height prop, pass it; otherwise, wrap in a fixed-height View */}
                <View style={{ height: 260 }}>
                  <SalesChart series={series} />
                </View>
              </Card>

              <TopProductsTable items={topProducts} />
            </View>

            {/* Alerts */}
            <AlertsPanel alerts={alerts} />
          </>
        )}
      </ScrollView>

      {/* Optional: floating “Add” menu (simple version) */}
      {/* 
      <View style={{
        position: 'absolute', right: 16, bottom: 24,
        backgroundColor: t.colors.primary.base, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 12,
      }}>
        <Text onPress={() => router.push('/sales/screens/NewSale')} style={text('label', t.colors.primary.onBase)}>＋</Text>
      </View>
      */}
    </SafeAreaView>
  );
}