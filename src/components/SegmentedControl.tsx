import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme, text, radius, border, space } from '@/src/theme';

export type Segment = { value: string; label: string };
export type SegmentedControlProps = {
  segments: Segment[];
  value: string;
  onChange: (val: string) => void;
  style?: ViewStyle;
};

export function SegmentedControl({ segments, value, onChange, style }: SegmentedControlProps) {
  const { theme: t } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: t.colors.surface3, borderColor: t.colors.border, borderRadius: radius.pill, borderWidth: border.thin },
        style,
      ]}
    >
      {segments.map((s, i) => {
        const active = s.value === value;
        return (
          <TouchableOpacity
            key={s.value}
            style={[
              styles.seg,
              active && { backgroundColor: t.colors.primary.surface, borderColor: t.colors.primary.border },
              { borderRadius: radius.pill },
            ]}
            onPress={() => onChange(s.value)}
            activeOpacity={0.85}
          >
            <Text style={text('label', active ? t.colors.primary.onSurface : t.colors.textSecondary)}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 2 },
  seg: { paddingVertical: 8, paddingHorizontal: 14, marginHorizontal: 2 },
});
