import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Tag } from '@/src/components';

async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const ROLES = ['owner', 'manager', 'cashier', 'staff'] as const;
type Role = typeof ROLES[number];

export default function UserNewPage() {
  const { theme: t } = useTheme();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const canSave = useMemo(() => username.trim().length >= 3 && password.length >= 6 && ROLES.includes(role), [username, password, role]);

  const toneForRole = (r: Role): 'danger'|'warning'|'info'|'neutral'|'success' => {
    if (r === 'owner') return 'danger';
    if (r === 'manager') return 'warning';
    if (r === 'cashier') return 'info';
    return 'neutral';
    };

  const save = async () => {
    try {
      setSaving(true);
      const body = { username: username.trim(), password, role, active };
      const r = await fetch(`${API_BASE}/api/users`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      Alert.alert('Created', 'User created', [{ text: 'OK', onPress: () => router.replace('/users' as any) }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ padding: layout.containerPadding, gap: space.md }}>
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>New User</Text>

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            style={{
              borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
              paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
            }}
          />

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Role</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map((r) => (
              <Tag key={r} label={r} tone={role === r ? toneForRole(r) : 'neutral'} onPress={() => setRole(r)} />
            ))}
          </View>

          <View style={{ height: space.sm }} />
          <Text style={text('label', t.colors.textSecondary)}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="min 6 chars"
            autoCapitalize="none"
            secureTextEntry
            style={{
              borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
              paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
            }}
          />

          <View style={{ height: space.sm }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={text('label', t.colors.textSecondary)}>Active</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>

          <View style={{ height: space.md }} />
          <Button title={saving ? 'Saving…' : 'Create'} onPress={save} disabled={!canSave || saving} />
        </Card>
      </View>
    </SafeAreaView>
  );
}
