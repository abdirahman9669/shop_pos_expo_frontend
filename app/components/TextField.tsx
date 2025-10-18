import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme, text, radius, border, space } from '@/src/theme';

export type TextFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: any;
};

export function TextField({
  label,
  helperText,
  errorText,
  left,
  right,
  containerStyle,
  editable = true,
  ...rest
}: TextFieldProps) {
  const { theme: t } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderCol = useMemo(() => {
    if (!editable) return t.colors.border;
    if (errorText) return t.colors.danger.base;
    return focused ? t.colors.primary.base : t.colors.border;
  }, [editable, errorText, focused, t.colors]);

  return (
    <View style={containerStyle}>
      {label ? <Text style={text('label', t.colors.textSecondary)}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: t.colors.surface3,
            borderColor: borderCol,
            borderWidth: border.thin,
            borderRadius: radius.md,
          },
        ]}
      >
        {left}
        <TextInput
          {...rest}
          editable={editable}
          placeholderTextColor={t.colors.textDisabled}
          style={[styles.input, text('body', t.colors.textPrimary)]}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        />
        {right}
      </View>
      {!!errorText ? (
        <Text style={text('caption', t.colors.danger.base)}>{errorText}</Text>
      ) : !!helperText ? (
        <Text style={text('caption', t.colors.textSecondary)}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, marginTop: 6 },
  input: { flex: 1, paddingVertical: 10 },
});
