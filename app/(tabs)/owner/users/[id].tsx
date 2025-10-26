// app/owner/users/[id].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout } from '@/src/theme';
import { Card } from '@/src/components';
import { isUUID } from '@/src/utils/validators'; // if you have it; otherwise remove this import
import { useAuth } from '@/src/auth/AuthContext'; // if you have it; otherwise remove and rely on TOKEN

type CapabilityRow = {
  key: string;
  label?: string;
  mode: 'grant' | 'revoke' | null;
};

export default function UserCapabilitiesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = String(id || '');
  const { theme: t } = useTheme();

  // If you have AuthContext, prefer it. Fallback to TOKEN from config.
  const auth = (() => {
    try { return useAuth?.(); } catch { return null as any; }
  })();
  const shopId = auth?.shop?.id ?? ''; // required by backend
  const token = auth?.token ?? TOKEN;

  const [rows, setRows] = useState<CapabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Basic guards (optional)
  if (!userId || (isUUID && !isUUID(userId))) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={text('body', t.colors.textSecondary)}>Invalid user ID</Text>
      </SafeAreaView>
    );
  }
  if (!shopId) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={text('body', t.colors.textSecondary)}>No active shop selected</Text>
      </SafeAreaView>
    );
  }

  async function loadCapabilities() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_BASE}/api/capabilities/${encodeURIComponent(userId)}/Ucapabilities?shop_id=${encodeURIComponent(shopId)}`,
        { headers: authHeaders }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load capabilities');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCapability(key: string, current: 'grant' | 'revoke' | null) {
    try {
      setSaving(true);
      setError(null);
      const nextMode = current === 'grant' ? 'revoke' : 'grant';
      const res = await fetch(
        `${API_BASE}/api/capabilities/${encodeURIComponent(userId)}/Ucapabilities/${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ mode: nextMode, shop_id: shopId }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setRows(prev => prev.map(r => r.key === key ? { ...r, mode: nextMode } : r));
    } catch (err: any) {
      setError(err?.message || 'Failed to save capability');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadCapabilities();
  }, [userId, shopId, token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'User Capabilities',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
        }}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={text('body', t.colors.textSecondary)}>Loading capabilities…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: layout.containerPadding }}>
          <Text style={text('body', t.colors.danger.base)}>Error: {error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: layout.containerPadding,
            gap: space.sm,
          }}
        >
          {rows.map(r => (
            <Card key={r.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={text('body', t.colors.textPrimary)}>{r.label || r.key}</Text>
                <Switch
                  value={r.mode === 'grant'}
                  onValueChange={() => toggleCapability(r.key, r.mode)}
                  disabled={saving}
                />
              </View>
            </Card>
          ))}
          {rows.length === 0 && (
            <Text style={text('body', t.colors.textSecondary)}>No capabilities defined.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}