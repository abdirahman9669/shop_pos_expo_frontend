// src/components/PINPad.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, text, space, radius, elevation } from '@/src/theme';

export function PINPad({ onSubmit, title = 'Manager PIN' }: { onSubmit: (pin: string) => void; title?: string }) {
  const { theme: t } = useTheme();
  const [pin, setPin] = useState('');

  const press = (d: string) => setPin((p) => (p + d).slice(0, 6));
  const back = () => setPin((p) => p.slice(0, -1));

  const Key = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[{ width: 64, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.surface3 }, elevation[1]]}>
      <Text style={text('h3', t.colors.textPrimary)}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ padding: 16, gap: space.md }}>
      <Text style={text('h2', t.colors.textPrimary)}>{title}</Text>
      <Text style={text('h1', t.colors.textPrimary)}>{'*'.repeat(pin.length).padEnd(6, '•')}</Text>
      <View style={{ gap: space.sm }}>
        {['123','456','789'].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: space.sm }}>
            {row.split('').map((d) => <Key key={d} label={d} onPress={() => press(d)} />)}
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Key label="⌫" onPress={back} />
          <Key label="0" onPress={() => press('0')} />
          <Key label="OK" onPress={() => onSubmit(pin)} />
        </View>
      </View>
    </View>
  );
}
