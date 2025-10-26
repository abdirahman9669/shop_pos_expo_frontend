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
  onUpdate?: (customer: any) => void; // parent can refresh their list
  customerId: string;
  initial?: { name?: string; phone?: string; note?: string };
};

export default function UpdateCustomerModal({ visible, onClose, onUpdate, customerId, initial }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] =  useState(initial?.name  ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [note, setNote] = useState(initial?.note  ?? '');

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

  // Seed form every time the sheet opens or the initial data changes
  React.useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setPhone(initial?.phone ?? '');
    setNote(initial?.note ?? '');
  }, [visible, initial?.name, initial?.phone, initial?.note]);



  const resetForm = () => {
    setName(initial?.name ?? '');
    setPhone(initial?.phone ?? '');
    setNote(initial?.note ?? '');
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

      const res = await fetch(`${API_BASE}/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: await getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || data?.ok === false) {
        const msg = data?.error || `Failed to save (HTTP ${res.status})`;
        throw new Error(msg);
      }

      // Inform parent so it can refresh
      onUpdate?.(data?.customer || payload);

      // Optional toast — or keep it silent
      Alert.alert('Customer updated', 'The customer has been updated successfully.');

      closeAndReset();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Unable to update customer.');
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
                    <Text style={text('h3', t.colors.textPrimary)}>Update Customer</Text>
                    <Text style={text('caption', t.colors.textSecondary)}>update customer to your shop</Text>
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
                    placeholder= "Full Name"
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
                    placeholder="+252611006900"
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    error={errors.phone}
                  />

                  {/* Note */}
                  <View style={{ height: space.md }} />
                  <FieldLabel label="Note" />
                  <Input
                    value={note}
                    placeholder="Note"
                    onChangeText={setNote}
                    multiline
                    numberOfLines={4}
                  />

                  {/* Actions */}
                  <View style={{ height: space.lg }} />
                  <View style={{ flexDirection: 'row', gap: space.sm }}>
                    <Button title="Cancel" variant="ghost" onPress={closeAndReset} />
                    <View style={{ flex: 1 }} />
                    <Button title={saving ? 'Saving…' : 'Save update Customer'} onPress={onSave} disabled={disabled} />
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