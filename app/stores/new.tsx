// app/stores/new.tsx
import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

export default function NewStoreScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required (min 2 characters).');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/stores`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({ name: name.trim(), ...(type.trim() ? { type: type.trim() } : {}) }),
      });

      // Try to parse JSON if server sent it; otherwise read text
      const ctype = r.headers.get('content-type') || '';
      const isJson = ctype.includes('application/json');
      const payload = isJson ? await r.json() : { ok: false, error: await r.text() };

      if (!r.ok || !payload?.ok) {
        throw new Error(payload?.error || `HTTP ${r.status}`);
      }

      // Success → go back to stores list (it will refetch)
      Alert.alert('✅ Store created', payload?.store?.name || 'OK', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Create store failed', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'New Store' }} />
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={s.label}>Name *</Text>
        <TextInput
          style={s.input}
          placeholder="e.g., Main Warehouse"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={s.label}>Type (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="e.g., Warehouse / Retail"
          value={type}
          onChangeText={setType}
          autoCapitalize="words"
        />

        <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Create store</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  label: { fontWeight: '700' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, backgroundColor: '#fff',
  },
  btn: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: '#fff', fontWeight: '800' },
});