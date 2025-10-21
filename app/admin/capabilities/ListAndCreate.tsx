// app/admin/capabilities/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';
import { useTheme, text, space, layout } from '@/src/theme';
import { Card, Button } from '@/src/components';
import { useAuth } from '@/src/auth/AuthContext'; // if available

type Capability = {
  id: string;
  key: string;
  label?: string;
  group?: string | null;
  description?: string | null;
  risk_level: 'low'|'medium'|'high';
  sort_order?: number;
  createdAt?: string;
};

export default function AdminCapabilitiesScreen() {
  const { theme: t } = useTheme();

  // Prefer token from auth if you have it; fallback to TOKEN
  const auth = (() => { try { return useAuth?.(); } catch { return null as any; } })();
  const token = auth?.token ?? TOKEN;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Form state
  const [keyVal, setKeyVal] = useState('');
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState('');
  const [description, setDescription] = useState('');
  const [risk, setRisk] = useState<'low'|'medium'|'high'>('low');
  const [sortOrder, setSortOrder] = useState('100');

  // List state
  const [items, setItems] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_BASE}/api/capabilities`, { headers });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      setItems(j.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load capabilities');
    } finally {
      setLoading(false);
    }
  }

  async function createCapability() {
    // quick client-side validation
    const re = /^[a-z0-9_-]+:[a-z0-9_-]+$/i;
    if (!keyVal || !re.test(keyVal)) {
      Alert.alert('Invalid key', "Use format section:action (letters, numbers, _ or -). Example: purchases:new");
      return;
    }
    try {
      setCreating(true);
      const body = {
        key: keyVal.trim(),
        label: label.trim() || keyVal.trim(),
        group: group.trim() || undefined,
        description: description.trim() || undefined,
        risk_level: risk,
        sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 100,
      };
      const r = await fetch(`${API_BASE}/api/capabilities`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      // success
      setKeyVal('');
      setLabel('');
      setGroup('');
      setDescription('');
      setRisk('low');
      setSortOrder('100');
      await load();
      Alert.alert('Capability created', j?.capability?.key || 'OK');
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Could not create capability');
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Capabilities',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: layout.containerPadding,
          gap: space.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Create form */}
        <Card>
          <Text style={text('h3', t.colors.textPrimary)}>Create Capability</Text>
          <View style={{ height: space.sm }} />

          <Text style={text('label', t.colors.textSecondary)}>Key (section:action)</Text>
          <TextInput
            value={keyVal}
            onChangeText={setKeyVal}
            placeholder="e.g. purchases:new"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white',
            }}
          />

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Create Purchase"
            style={{
              borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white',
            }}
          />

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Group</Text>
          <TextInput
            value={group}
            onChangeText={setGroup}
            placeholder="purchases"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white',
            }}
          />

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What this capability allows"
            multiline
            style={{
              borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white', minHeight: 70,
            }}
          />

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Risk</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={`low${risk === 'low' ? ' ✓' : ''}`} variant={risk === 'low' ? 'secondary' : 'ghost'} onPress={() => setRisk('low')} />
            <Button title={`medium${risk === 'medium' ? ' ✓' : ''}`} variant={risk === 'medium' ? 'secondary' : 'ghost'} onPress={() => setRisk('medium')} />
            <Button title={`high${risk === 'high' ? ' ✓' : ''}`} variant={risk === 'high' ? 'secondary' : 'ghost'} onPress={() => setRisk('high')} />
          </View>

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Sort order</Text>
          <TextInput
            value={sortOrder}
            onChangeText={setSortOrder}
            keyboardType="number-pad"
            placeholder="100"
            style={{
              borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white', width: 120,
            }}
          />

          <View style={{ height: space.md }} />
          <Button title={creating ? 'Creating…' : 'Create Capability'} onPress={createCapability} disabled={creating} />
        </Card>

        {/* Existing list */}
        <Card>
          <Text style={text('h3', t.colors.textPrimary)}>Existing Capabilities</Text>
          <View style={{ height: space.xs }} />
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator />
              <Text style={text('body', t.colors.textSecondary)}>Loading…</Text>
            </View>
          ) : error ? (
            <Text style={text('body', t.colors.danger.base)}>Error: {error}</Text>
          ) : items.length === 0 ? (
            <Text style={text('body', t.colors.textSecondary)}>No capabilities yet.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {items.map((c) => (
                <View
                  key={c.id}
                  style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                >
                  <Text style={text('body', t.colors.textPrimary)}>{c.key}</Text>
                  <Text style={text('caption', t.colors.textSecondary)}>
                    {c.label || c.key} • {c.group || '—'} • risk: {c.risk_level}
                    {typeof c.sort_order === 'number' ? ` • sort: ${c.sort_order}` : ''}
                  </Text>
                  {c.description ? (
                    <Text style={[text('caption', t.colors.textSecondary), { marginTop: 2 }]}>{c.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}