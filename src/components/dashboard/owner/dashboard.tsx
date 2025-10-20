import React from 'react';
import {  View, Text, TouchableOpacity } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useOwnerDashboard } from '@/src/hooks/useOwnerDashboard';
import { useTheme, text, space, layout } from '@/src/theme';
import { Button, Card, SegmentedControl } from '@/src/components';
import  DashboardKPICards  from '@/src/components/dashboard/owner/DashboardKPICards';
import  SalesChart  from '@/src/components/dashboard/owner/SalesChart';
import  TopProductsTable  from '@/src/components/dashboard/owner/TopProductsTable';
import AlertsPanel  from '@/src/components/dashboard/owner/AlertsPanel';



export default function OwnerDashboardScreen() {
  const { theme: t, toggleLightDark, resolvedMode } = useTheme();
  const {
    from, to, setFrom, setTo, grain, setGrain,
    loading, error, kpis, series, topProducts, alerts,
  } = useOwnerDashboard();

  const setPreset = (days: number) => {
    setFrom(new Date(Date.now() - (days - 1) * 24 * 3600 * 1000));
    setTo(new Date());
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Owner Dashboard',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight: () => (
            <Button title={resolvedMode === 'light' ? 'Dark' : 'Light'} variant="ghost" onPress={toggleLightDark} />
          ),
        }}
      />

      <View style={{ padding: layout.containerPadding, gap: space.lg }}>
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

        {/* Loading / Error */}
        {loading ? (
          <Text style={text('body', t.colors.textSecondary)}>Loading…</Text>
        ) : error ? (
          <Text style={text('body', t.colors.danger.base)}>Error: {error}</Text>
        ) : (
          <>
            {/* Row 1: KPI Strip */}
            <DashboardKPICards kpis={kpis} />

            {/* Row 2: Chart + Top products */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <View style={{ flex: 2, minWidth: 320 }}>
                <SalesChart series={series} />
              </View>
              <View style={{ flex: 1, minWidth: 300 }}>
                <TopProductsTable items={topProducts} />
              </View>
            </View>

            {/* Row 3: Alerts */}
            <AlertsPanel alerts={alerts} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
