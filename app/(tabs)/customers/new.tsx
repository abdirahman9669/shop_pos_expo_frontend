import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, text, space, layout, radius } from '@/src/theme';
import { Button, Card } from '@/src/components';
import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';

type Payload = {
  name: string;
  phone?: string | null;
  note?: string | null;
};

export default function NewCustomerScreen() {
  const router = useRouter();
  const { theme: t } = useTheme();

  // form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{name?: string; phone?: string}>({});

  const disabled = useMemo(() => {
    return saving || !name.trim();
  }, [saving, name]);

  // simple client validation
  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (phone && !/^[0-9+\-\s()]{6,}$/.test(phone)) e.phone = 'Enter a valid phone';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getHeaders = async () => {
    const auth = await loadAuth(); // { token, ... } | null
    return {
      'Content-Type': 'application/json',
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    };
  };

  const onSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload: Payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        note: note.trim() || null,
      };
      console.log('Saving customer------------------------------------------------', payload);
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || data?.ok === false) {
        const msg = data?.error || `Failed to save (HTTP ${res.status})`;
        throw new Error(msg);
      }

      Alert.alert('Customer created', 'The customer has been added successfully.', [
        { text: 'OK', onPress: () => router.replace('/customers/All') },
      ]);
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Unable to create customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'New Customer',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          contentContainerStyle={{
            padding: layout.containerPadding,
            gap: space.lg,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Card */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.colors.primary.surface,
                }}
              >
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={t.colors.primary.base as string}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={text('h3', t.colors.textPrimary)}>New Customer</Text>
                <Text style={text('caption', t.colors.textSecondary)}>
                  Add a new customer to your shop
                </Text>
              </View>
            </View>
          </Card>

          {/* Form Card */}
          <Card>
            {/* Name */}
            <FieldLabel label="Full Name" required />
            <Input
              value={name}
              placeholder="e.g. Abdi Ahmed"
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
              error={errors.name}
            />

            {/* Phone */}
            <View style={{ height: space.md }} />
            <FieldLabel label="Phone" />
            <Input
              value={phone}
              placeholder="e.g. 612345678"
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
            />

            {/* Note */}
            <View style={{ height: space.md }} />
            <FieldLabel label="Note" />
            <Input
              value={note}
              placeholder="Any note about this customer…"
              onChangeText={setNote}
              multiline
              numberOfLines={4}
            />

            {/* Actions */}
            <View style={{ height: space.lg }} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => router.back()}
              />
              <View style={{ flex: 1 }} />
              <Button
                title={saving ? 'Saving…' : 'Save Customer'}
                onPress={onSave}
                disabled={disabled}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Small themed helpers ---------- */

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <Text style={text('label', t.colors.textSecondary)}>{label}</Text>
      {required ? (
        <Text style={text('label', t.colors.danger.base)}>*</Text>
      ) : null}
    </View>
  );
}

function Input({
  error,
  style,
  ...props
}: React.ComponentProps<typeof TextInput> & { error?: string | null }) {
  const { theme: t } = useTheme();
  const borderColor = error ? t.colors.danger.base : t.colors.border;

  return (
    <>
      <TextInput
        {...props}
        placeholderTextColor={t.colors.textSecondary as string}
        style={[
          {
            borderWidth: 1,
            borderColor,
            backgroundColor: t.colors.surface,
            color: t.colors.textPrimary,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            paddingVertical: 10,
          },
          props.multiline && { textAlignVertical: 'top' as const },
          style,
        ]}
      />
      {error ? (
        <Text style={[text('caption', t.colors.danger.base), { marginTop: 4 }]}>
          {error}
        </Text>
      ) : null}
    </>
  );
}