// app/admin/shops/[id].tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout } from '@/src/theme';
import { Card } from '@/src/components';
import { isUUID } from '@/src/utils/validators'; // optional helper

type CapabilityRow = {
  key: string;
  label?: string;
  mode: 'grant' | 'revoke' | null;
};

export default function ShopCapabilitiesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t } = useTheme();

  const [rows, setRows] = useState<CapabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };

  // Guard invalid ID
  if (!id || id === 'index' || !isUUID(id)) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={text('body', t.colors.textSecondary)}>Invalid shop ID</Text>
      </SafeAreaView>
    );
  }

  async function loadCapabilities() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/capabilities/${id}/Scapabilities`, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load capabilities');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCapability(key: string, current: string | null) {
    try {
      setSaving(true);
      const nextMode = current === 'grant' ? 'revoke' : 'grant';
      const res = await fetch(`${API_BASE}/api/capabilities/${id}/Scapabilities/${key}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ mode: nextMode }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((prev) =>
        prev.map((r) => (r.key === key ? { ...r, mode: nextMode } : r))
      );
    } catch (err: any) {
      console.error('toggleCapability error:', err);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadCapabilities();
  }, [id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Shop Capabilities',
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
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