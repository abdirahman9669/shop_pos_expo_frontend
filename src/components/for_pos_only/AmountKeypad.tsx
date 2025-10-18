// src/components/AmountKeypad.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, text, space, radius, elevation } from '@/src/theme';

type Key = '7'|'8'|'9'|'4'|'5'|'6'|'1'|'2'|'3'|'0'|'.'|'C'|'⌫'|'+1k'|'+5k';
export type AmountKeypadProps = {
  onPress: (k: Key) => void;
  disabled?: boolean;
};

const ROWS: Key[][] = [
  ['7','8','9','+1k'],
  ['4','5','6','+5k'],
  ['1','2','3','C'],
  ['0','.', '⌫'],
];

export function AmountKeypad({ onPress, disabled }: AmountKeypadProps) {
  const { theme: t } = useTheme();

  const Button = ({ label }: { label: Key }) => (
    <TouchableOpacity
      onPress={() => onPress(label)}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.key,
        elevation[1],
        { backgroundColor: t.colors.surface3, borderRadius: radius.md, opacity: disabled ? t.states.disabled : 1 },
      ]}
    >
      <Text style={text('h3', t.colors.textPrimary)}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ gap: space.sm }}>
      {ROWS.map((row, idx) => (
        <View key={idx} style={{ flexDirection: 'row', gap: space.sm }}>
          {row.map((k) => <Button key={k} label={k} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  key: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
});
