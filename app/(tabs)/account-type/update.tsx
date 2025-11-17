import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';
import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Card, Button, Tag } from '@/src/components';
import { TextInput } from 'react-native-gesture-handler';

/* auth */
async function authHeaders() {
  const auth = await loadAuth();
  const token = auth?.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type TypeRow = { id: string; name: string; normal_side: 'debit'|'credit' };

export default function AccountTypeUpdate() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [normal, setNormal] = useState<'debit'|'credit'>('debit');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  // load existing
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Safe: fetch list & pick by id (works even if no GET /:id)
        const r = await fetch(`${API_BASE}/api/account-types`, { headers: await authHeaders() });
        const j = await r.json();
        if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
        const found: TypeRow | undefined = (j?.data ?? []).find((x: TypeRow) => x.id === id);
        if (alive) {
          if (found) {
            setName(found.name);
            setNormal(found.normal_side);
          } else {
            setErr('Not found');
          }
        }
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const save = async () => {
    try {
      setSaving(true);
      setErr(null);
      const r = await fetch(`${API_BASE}/api/account-types/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ name: name.trim(), normal_side: normal }),
      });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      Alert.alert('Updated', 'Account type updated');
      router.back();
    } catch (e: any) {
      setErr(e?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: layout.containerPadding, paddingTop: space.md, paddingBottom: space.md }}>
      <Card>
        <View style={{ gap: space.md }}>
          <Tag tone="neutral" label="Update Account Type" />

          <TextInput
            placeholder="Name"
            placeholderTextColor={t.colors.textSecondary as string}
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1, borderColor: t.colors.border, borderRadius: radius.md,
              paddingHorizontal: 12, paddingVertical: 10, color: t.colors.textPrimary,
              backgroundColor: t.colors.surface,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title={`Debit${normal === 'debit' ? ' ✓' : ''}`}
              variant={normal === 'debit' ? 'primary' : 'secondary'}
              onPress={() => setNormal('debit')}
            />
            <Button
              title={`Credit${normal === 'credit' ? ' ✓' : ''}`}
              variant={normal === 'credit' ? 'primary' : 'secondary'}
              onPress={() => setNormal('credit')}
            />
          </View>

          {loading ? <Tag tone="neutral" label="Loading…" /> : null}
          {err ? <Tag tone="warning" label={`⚠ ${err}`} /> : null}

          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
            <Button title={saving ? 'Saving…' : 'Save Changes'} onPress={save} disabled={!canSave || saving || loading} />
          </View>
        </View>
      </Card>
    </View>
  );
}
