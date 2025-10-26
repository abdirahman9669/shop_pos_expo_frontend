import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, text, space, layout } from '@/src/theme';

type Props = {
  shopName?: string;
  onMenu: () => void;
};

export default function DashboardHeader({ shopName, onMenu }: Props) {
  const { theme: t } = useTheme();

  return (
    <View style={{
      height: 56,
      backgroundColor: t.colors.surface,
      borderBottomWidth: 1, borderBottomColor: t.colors.border,
      paddingHorizontal: layout.containerPadding,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
    }}>
      <TouchableOpacity onPress={onMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={text('h3', t.colors.textPrimary)}>☰</Text>
      </TouchableOpacity>

      <Text numberOfLines={1} style={text('h3', t.colors.textPrimary)}>
        {shopName || 'Dashboard'}
      </Text>

      {/* right spacer (could hold notifications) */}
      <View style={{ width: 28 }} />
    </View>
  );
}
