// app/(shell)/index.tsx
import React from 'react';
import {
  AppState,
  RefreshControl,
  ScrollView,
  Text,
  Pressable,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/src/auth/AuthContext';
import { useCapabilities } from '@/src/hooks/useCapabilities';
import { useOwnerDashboard } from '@/src/hooks/useOwnerDashboard';
import { useTheme, text, space } from '@/src/theme';
import { Button, Card, SegmentedControl } from '@/src/components';
import DashboardKPICards from '@/src/components/dashboard/owner/DashboardKPICards';
import SalesChart from '@/src/components/dashboard/owner/SalesChart';
import TopProductsTable from '@/src/components/dashboard/owner/TopProductsTable';
import AlertsPanel from '@/src/components/dashboard/owner/AlertsPanel';


export default function HomeScreen() {

  const { theme: t, toggleLightDark, resolvedMode } = useTheme();
  const router = useRouter();
  const auth = useAuth();

  // Caps + dashboard data
  const { ready, can, refresh: refreshCaps } = useCapabilities();
  const {
    from, to, setFrom, setTo, grain, setGrain,
    loading, error, kpis, series, topProducts, alerts, reload,
  } = useOwnerDashboard();

  // Local state
  const [refreshing, setRefreshing] = React.useState(false);
  const refreshingGuard = React.useRef(false);
  const [rangePreset, setRangePreset] = React.useState<'7d' | '30d' | '90d'>('7d');

  // Derived
  const userName = auth?.user?.username ?? 'nn';
  const userRole = auth?.user?.role ?? '';
  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Header (native header is hidden by shell, but we can still keep options if needed)
  const headerRightEl = React.useMemo(
    () => (
      <Button
        title={resolvedMode === 'light' ? 'Light' : 'Dark'}
        variant="ghost"
        onPress={toggleLightDark}
      />
    ),
    [resolvedMode, toggleLightDark]
  );
  const headerRight = React.useCallback(() => headerRightEl, [headerRightEl]);
  const screenOptions = React.useMemo(
    () => ({
      title: 'Home',
      headerStyle: { backgroundColor: t.colors.surface },
      headerTintColor: t.colors.textPrimary,
      headerRight,
    }),
    [t.colors.surface, t.colors.textPrimary, headerRight]
  );

  // Helpers
  const setPreset = React.useCallback(
    (days: number, tag: '7d' | '30d' | '90d') => {
      setFrom(new Date(Date.now() - (days - 1) * 24 * 3600 * 1000));
      setTo(new Date());
      setRangePreset(tag);
    },
    [setFrom, setTo]
  );

  const SectionTitle = React.useCallback(
    ({ icon, title }: { icon: React.ReactNode; title: string }) => (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {icon}
        <Text style={text('h3', t.colors.textPrimary)}>{title}</Text>
      </View>
    ),
    [t.colors.textPrimary, text]
  );

  const ActionTile = React.useCallback(
    ({
      label,
      icon,
      onPress,
      disabled,
    }: {
      label: string;
      icon: React.ReactNode;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        android_ripple={{ color: t.colors.border }}
        style={({ pressed }) => ({
          width: '31%',
          aspectRatio: 1,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: t.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.4 : pressed ? 0.9 : 1,
        })}
      >
        {icon}
        <Text style={text('caption', t.colors.textPrimary)} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    ),
    [t.colors.border, t.colors.surface, t.colors.textPrimary, text]
  );

  // Refresh behaviors
  useFocusEffect(
    React.useCallback(() => {
      refreshCaps?.();
      reload?.();
      return () => {};
    }, [refreshCaps, reload])
  );

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshCaps?.();
        reload?.();
      }
    });
    return () => sub.remove();
  }, [refreshCaps, reload]);

  const onRefresh = React.useCallback(async () => {
    if (refreshingGuard.current) return;
    refreshingGuard.current = true;
    setRefreshing(true);
    try {
      await Promise.all([Promise.resolve(reload?.()), Promise.resolve(refreshCaps?.())]);
    } finally {
      setRefreshing(false);
      refreshingGuard.current = false;
    }
  }, [refreshCaps, reload]);

  // Render
  return (
    <>
      <Stack.Screen options={screenOptions} />

      {/* The shell already adds padding & background; keep content lean here */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.textSecondary as string}
            colors={[t.colors.primary.base as string]}
            progressBackgroundColor={t.colors.surface as string}
            progressViewOffset={56}
          />
        }
        contentContainerStyle={{ gap: space.lg, paddingBottom: space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 42, height: 42, borderRadius: 21,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: t.colors.primary.base,
              }}
            >
              <Ionicons name="sparkles-outline" size={20} color={t.colors.primary.onBase as string} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={text('h3', t.colors.textPrimary)}>{greeting}, {userName}</Text>
              {!!userRole && (
                <Text style={text('caption', t.colors.textSecondary)}>
                  Role: {userRole}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card>
          <SectionTitle
            icon={<Ionicons name="flash-outline" size={18} color={t.colors.textSecondary as string} />}
            title="Quick Actions"
          />
          <View style={{ height: space.xs }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 12 }}>
            <ActionTile
              label="Create Product"
              icon={
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: 'rgba(79,70,229,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <MaterialCommunityIcons name="cube-outline" size={24} color="#4F46E5" />
                </View>
              }
              onPress={() => router.push('/products/new')}
            />

            {ready && can('sales:new') && (
              <ActionTile
                label="New Sale"
                icon={
                  <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: 'rgba(22,163,74,0.12)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="cash-outline" size={24} color="#16A34A" />
                  </View>
                }
                onPress={() => router.push('/sales/screens/NewSale')}
              />
            )}

            <ActionTile
              label="Customers"
              icon={
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: 'rgba(14,165,233,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="people-outline" size={22} color="#0EA5E9" />
                </View>
              }
              onPress={() => router.push('/')}
            />

            <ActionTile
              label="Suppliers"
              icon={
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: 'rgba(249,115,22,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="storefront" size={22} color="#F97316" />
                </View>
              }
              onPress={() => router.push('/')}
            />

            <ActionTile
              label="Payments"
              icon={
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: 'rgba(147,51,234,0.122)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="card-outline" size={22} color="#9333EA" />
                </View>
              }
              onPress={() => router.push('/')}
            />

            {ready && can('purchases:new') && (
              <ActionTile
                label="New Purchase"
                icon={
                  <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: 'rgba(234,179,8,0.12)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="cart-outline" size={22} color="#EAB308" />
                  </View>
                }
                onPress={() => router.push('/')}
              />
            )}
          </View>
        </Card>

        {/* Filters */}
        <Card>
          <SectionTitle
            icon={<Ionicons name="funnel-outline" size={18} color={t.colors.textSecondary as string} />}
            title="Filters"
          />
          <View style={{ height: space.xs }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
            <Text style={text('label', t.colors.textSecondary)}>Range:</Text>
            <SegmentedControl
              value={rangePreset}
              onChange={(v) => {
                if (v === '7d') setPreset(7, '7d');
                if (v === '30d') setPreset(30, '30d');
                if (v === '90d') setPreset(90, '90d');
              }}
              segments={[
                { value: '7d', label: '7d' },
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
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
            />
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={16} color={t.colors.textSecondary as string} />
              <Text style={text('caption', t.colors.textSecondary)}>
                {from.toDateString()} → {to.toDateString()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Main content */}
        {loading ? (
          <Card>
            <View style={{ paddingVertical: 6 }}>
              <Text style={text('body', t.colors.textSecondary)}>Loading…</Text>
              {!ready && (
                <Text style={text('caption', t.colors.textSecondary)}>Checking your permissions…</Text>
              )}
            </View>
          </Card>
        ) : error ? (
          <Card>
            <SectionTitle
              icon={<Ionicons name="alert-circle-outline" size={18} color={t.colors.danger.base as string} />}
              title="Error"
            />
            <Text style={text('body', t.colors.danger.base)}>{error}</Text>
          </Card>
        ) : (
          <>
            <Card>
              <SectionTitle
                icon={<Ionicons name="stats-chart-outline" size={18} color={t.colors.textSecondary as string} />}
                title="KPIs"
              />
              <View style={{ height: space.xs }} />
              <DashboardKPICards kpis={kpis} />
            </Card>

            <Card>
              <View style={{ height: space.sm }} />
              <View style={{ height: 260 }}>
                <SalesChart series={series} />
              </View>
            </Card>

            <Card>
              <TopProductsTable items={topProducts} />
            </Card>

            <Card>
              <SectionTitle
                icon={<Ionicons name="notifications-outline" size={18} color={t.colors.textSecondary as string} />}
                title="Alerts"
              />
              <AlertsPanel alerts={alerts} />
            </Card>
          </>
        )}
      </ScrollView>
    </>
  );
}