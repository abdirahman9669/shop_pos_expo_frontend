// src/components/ConfirmDialog.tsx
import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useTheme, text, space, radius } from '@/src/theme';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'neutral'|'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible, title, message, confirmLabel='Confirm', cancelLabel='Cancel', tone='neutral', onConfirm, onCancel,
}: ConfirmDialogProps) {
  const { theme: t } = useTheme();
  const c = tone === 'danger' ? t.colors.danger : t.colors.primary;

  return (
    <Modal visible={visible} transparent onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth: 420, borderRadius: radius.lg, backgroundColor: t.colors.surface3, padding: 16 }}>
          <Text style={text('h3', t.colors.textPrimary)}>{title}</Text>
          {!!message && <Text style={[text('body', t.colors.textSecondary), { marginTop: space.xs }]}>{message}</Text>}
          <View style={{ height: space.md }} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm }}>
            <TouchableOpacity onPress={onCancel}><Text style={text('label', t.colors.textSecondary)}>{cancelLabel}</Text></TouchableOpacity>
            <TouchableOpacity onPress={onConfirm}><Text style={text('label', c.base)}>{confirmLabel}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
