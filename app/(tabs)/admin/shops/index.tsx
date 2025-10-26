// app/admin/shops/index.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout } from '@/src/theme';
import { Card, Button } from '@/src/components';

type Shop = {
  id: string;
  name: string;
  slug?: string;
  phone_number?: string;
  code?: string;
  createdAt?: string;
};

export default function ShopListScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };

  async function loadShops() {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/shops`, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setShops(data.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShops();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'All Shops',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: layout.containerPadding,
          gap: space.sm,
        }}
      >
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator />
            <Text style={text('body', t.colors.textSecondary)}>Loading shops…</Text>
          </View>
        ) : error ? (
          <Text style={text('body', t.colors.danger.base)}>Error: {error}</Text>
        ) : shops.length === 0 ? (
          <Text style={text('body', t.colors.textSecondary)}>No shops found.</Text>
        ) : (
          shops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/admin/shops/${shop.id}`)}
            >
              <Card>
                <Text style={text('h3', t.colors.textPrimary)}>{shop.name}</Text>
                {shop.phone_number && (
                  <Text style={text('body', t.colors.textSecondary)}>
                    Phone: {shop.phone_number}
                  </Text>
                )}
                {shop.code && (
                  <Text style={text('body', t.colors.textSecondary)}>Code: {shop.code}</Text>
                )}
                {shop.createdAt && (
                  <Text style={text('caption', t.colors.textSecondary)}>
                    Created: {new Date(shop.createdAt).toDateString()}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

{/* Footer buttons */}
      <View style={{ padding: layout.containerPadding, gap: space.sm }}>
        <Button
          title="Refresh"
          variant="secondary"
          onPress={() => {
            setError(null);
            setLoading(true);
            fetch(`${API_BASE}/api/shops`, { headers: authHeaders })
              .then((r) => r.json())
              .then((data) => setShops(Array.isArray(data.items) ? data.items : data.items ?? []))
              .catch((e) => setError(e?.message || 'Failed to refresh'))
              .finally(() => setLoading(false));
          }}
        />

        {/* ✅ New Capability button */}
        <Button
          title="+ Create New Capability"
          variant="primary"
          onPress={() => router.push('/admin/capabilities/ListAndCreate')}
        />
      </View>
     
    </SafeAreaView>
  );
}