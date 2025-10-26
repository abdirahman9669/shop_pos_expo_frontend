import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme, text, space, radius } from '@/src/theme';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export function ListItem({ title, subtitle, meta, left, right, onPress, style }: ListItemProps) {
  const { theme: t } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: t.colors.surface3, borderColor: t.colors.border, borderRadius: radius.md },
        style,
      ]}
    >
      {left ? <View style={{ marginRight: space.md }}>{left}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={text('body', t.colors.textPrimary)} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={text('bodySm', t.colors.textSecondary)} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={text('caption', t.colors.textSecondary)}>{meta}</Text> : null}
      {right ? <View style={{ marginLeft: space.md }}>{right}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, gap: space.sm },
});
