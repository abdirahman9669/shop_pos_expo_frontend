// app/suppliers/new.tsx
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

/** TEMP auth (move to secure storage) */
const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

export default function NewSupplierScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const canSave = name.trim().length >= 2 && !busy;

  const save = useCallback(async () => {
    if (!canSave) return;

    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/suppliers`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined, note: note.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok || !j?.supplier?.id) {
        // 409 = duplicate supplier
        const msg = j?.error || `HTTP ${r.status}`;
        Alert.alert('Could not create supplier', msg);
        return;
      }

      // success → go to the new supplier detail
      router.replace({ pathname: '/suppliers/[id]' as const, params: { id: j.supplier.id } });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create supplier');
    } finally {
      setBusy(false);
    }
  }, [name, phone, note, canSave, router]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'New Supplier',
          headerRight: () => (
            <TouchableOpacity onPress={save} disabled={!canSave} style={[s.headerBtn, !canSave && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.headerBtnTxt}>Save</Text>}
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.wrap}>
          <Text style={s.title}>Create Supplier</Text>

          <Text style={s.label}>Name *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., City Wholesaler Ltd"
            autoCapitalize="words"
          />
          <Text style={s.hint}>Minimum 2 characters.</Text>

          <Text style={s.label}>Phone</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g., 252-61-0000000"
            keyboardType="phone-pad"
          />

          <Text style={s.label}>Note</Text>
          <TextInput
            style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder="e.g., Credit 15 days"
            multiline
          />

          <TouchableOpacity onPress={save} disabled={!canSave} style={[s.submit, !canSave && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Create Supplier</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 10 },
  title: { fontWeight: '800', fontSize: 20, marginBottom: 6 },
  label: { fontWeight: '700', marginTop: 6 },
  hint: { color: '#777', fontSize: 12, marginTop: -4, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 10, padding: 12, backgroundColor: 'white' },
  submit: { marginTop: 12, backgroundColor: '#000', padding: 14, borderRadius: 12, alignItems: 'center' },
  submitTxt: { color: '#fff', fontWeight: '800' },

  headerBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  headerBtnTxt: { color: '#fff', fontWeight: '800' },
});