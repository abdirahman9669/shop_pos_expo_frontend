// src/components/ListItem.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme, text, space, radius } from '@/src/theme';

type MaybeNode = string | number | React.ReactNode;

export type ListItemProps = {
  title: MaybeNode;
  subtitle?: MaybeNode;
  meta?: MaybeNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function AsText({ value, style }: { value?: MaybeNode; style: any }) {
  if (value == null) return null;
  return typeof value === 'string' || typeof value === 'number'
    ? <Text style={style}>{value}</Text>
    : <>{value}</>;
}

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
        <AsText value={title} style={text('body', t.colors.textPrimary)} />
        {subtitle ? (
          <View style={{ marginTop: 2 }}>
            <AsText value={subtitle} style={text('bodySm', t.colors.textSecondary)} />
          </View>
        ) : null}
      </View>

      {meta ? (
        <View>
          <AsText value={meta} style={text('caption', t.colors.textSecondary)} />
        </View>
      ) : null}

      {right ? <View style={{ marginLeft: space.md }}>{right}</View> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
  },
});