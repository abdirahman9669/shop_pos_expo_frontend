import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, text, layout } from '@/src/theme';

type Item = { label: string; route?: string; onPress?: () => void; disabled?: boolean };

type Props = {
  items?: Item[];
};

export default function DashboardFooter({ items = [] }: Props) {
  const router = useRouter();
  const { theme: t } = useTheme();

  return (
    <View style={{
      height: 60,
      backgroundColor: t.colors.surface,
      borderTopWidth: 1, borderTopColor: t.colors.border,
      paddingHorizontal: layout.containerPadding,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {items.map((it, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() => (it.onPress ? it.onPress() : it.route ? router.push(it.route as any) : null)}
          disabled={it.disabled}
          style={{ opacity: it.disabled ? 0.4 : 1 }}
        >
          <Text style={text('label', t.colors.textPrimary)}>{it.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
