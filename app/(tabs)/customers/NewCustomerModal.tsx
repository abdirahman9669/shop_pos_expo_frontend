// src/features/customers/NewCustomerModal.tsx
import React, { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
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

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (customer: any) => void; // parent can refresh their list
};

export default function NewCustomerModal({ visible, onClose, onCreated }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const disabled = useMemo(() => saving || !name.trim(), [saving, name]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (phone && !/^[0-9+\-\s()]{6,}$/.test(phone)) e.phone = 'Enter a valid phone';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getHeaders = async () => {
    const auth = await loadAuth(); // { token } | null
    return {
      'Content-Type': 'application/json',
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    };
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setNote('');
    setErrors({});
  };

  const closeAndReset = () => {
    resetForm();
    onClose?.();
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

      // Inform parent so it can refresh
      onCreated?.(data?.customer || payload);

      // Optional toast — or keep it silent
      Alert.alert('Customer created', 'The customer has been added successfully.');

      closeAndReset();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Unable to create customer.');
    } finally {
      setSaving(false);
    }
  };

   return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeAndReset}>
      {/* Dim backdrop */}
      <Pressable
        onPress={closeAndReset}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        // let inner content receive touches
        pointerEvents="auto"
      >
        {/* Keep taps inside from closing */}
        <Pressable onPress={() => {}} style={{ flex: 1 }} pointerEvents="box-none">
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            {/* Bottom sheet */}
            <View
              style={{
                backgroundColor: t.colors.surface,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                // give the sheet a max height so its content can scroll
                maxHeight: '85%',
                overflow: 'hidden',
              }}
            >
              {/* Drag handle */}
              <View
                style={{
                  alignSelf: 'center',
                  width: 44,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: t.colors.border,
                  marginTop: 8,
                }}
              />

              {/* Make the inside scroll when keyboard appears */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  padding: layout.containerPadding,
                  paddingBottom: layout.containerPadding + insets.bottom + 12, // keep clear of keyboard & home indicator
                  gap: space.md,
                }}
              >
                {/* Title row */}
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
                    <Ionicons name="person-add-outline" size={20} color={t.colors.primary.base as string} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={text('h3', t.colors.textPrimary)}>New Customer</Text>
                    <Text style={text('caption', t.colors.textSecondary)}>Add a new customer to your shop</Text>
                  </View>
                  <Pressable onPress={closeAndReset} hitSlop={10}>
                    <Ionicons name="close" size={22} color={t.colors.textSecondary as string} />
                  </Pressable>
                </View>

                {/* Form (Card look) */}
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
                    <Button title="Cancel" variant="ghost" onPress={closeAndReset} />
                    <View style={{ flex: 1 }} />
                    <Button title={saving ? 'Saving…' : 'Save Customer'} onPress={onSave} disabled={disabled} />
                  </View>
                </Card>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* --- tiny themed bits reused from your page --- */
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { theme: t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <Text style={text('label', t.colors.textSecondary)}>{label}</Text>
      {required ? <Text style={text('label', t.colors.danger.base)}>*</Text> : null}
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
        <Text style={[text('caption', t.colors.danger.base), { marginTop: 4 }]}>{error}</Text>
      ) : null}
    </>
  );
}