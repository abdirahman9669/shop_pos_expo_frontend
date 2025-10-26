// src/components/DateInput.tsx
import * as React from 'react';
import { Platform, Pressable, Text, View, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, text, radius } from '@/src/theme';

function parseYMD(s?: string): Date {
  if (!s) return new Date();
  const [y,m,d] = s.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, (m - 1), d);
}
function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export function DateInput({
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  label: string;
  value: string;                 // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const { theme: t } = useTheme();
  const [show, setShow] = React.useState(false);
  const [temp, setTemp] = React.useState<Date>(parseYMD(value));

  React.useEffect(() => { setTemp(parseYMD(value)); }, [value]);

  const open = () => setShow(true);
  const close = () => setShow(false);

  const onNativeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (date) onChange(fmtYMD(date));
    } else {
      if (date) setTemp(date);
    }
  };

  const confirmIOS = () => {
    onChange(fmtYMD(temp));
    close();
  };

  // Web: simple fallback — let user type or use native date input if available
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <Text style={text('label', t.colors.textSecondary)}>{label}</Text>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            marginTop: 6,
            width: '100%',
            borderWidth: 1,
            borderColor: t.colors.border as string,
            background: t.colors.surface as string,
            color: t.colors.textPrimary as string,
            borderRadius: radius.md,
            padding: 12,
            outline: 'none',
          } as any}
        />
      </View>
    );
  }

  // Native: pressable “input” that opens the picker
  return (
    <View style={{ flex: 1 }}>
      <Text style={text('label', t.colors.textSecondary)}>{label}</Text>
      <Pressable
        onPress={open}
        style={{
          marginTop: 6,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: t.colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={text('body', t.colors.textPrimary)}>{value}</Text>
      </Pressable>

      {/* ANDROID: inline modal-less picker; iOS: present in a modal with Confirm/Cancel */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          mode="date"
          value={parseYMD(value)}
          onChange={onNativeChange}
          display="calendar"
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}

{show && Platform.OS === 'ios' && (
  <Modal
    visible
    transparent
    animationType="fade"
    presentationStyle="overFullScreen"
    onRequestClose={close}
  >
    {/* Dim background */}
    <Pressable
      onPress={close}
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-start', // show near top
        paddingTop: 72,               // push it down a bit from the top
        paddingHorizontal: 16,
      }}
    >
      {/* Card panel (tap inside shouldn't close) */}
      <Pressable
        onPress={() => {}}
        style={{
          alignSelf: 'center',
          width: '92%',
          maxWidth: 420,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: t.colors.surface,
        }}
      >
        <View style={{ padding: 12 }}>
          <DateTimePicker
            mode="date"
            value={temp}
            onChange={onNativeChange}
            display="inline" // calendar style
            minimumDate={minDate}
            maximumDate={maxDate}
          />

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingTop: 8 }}>
            <Pressable onPress={close}>
              <Text style={text('label', t.colors.textSecondary)}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirmIOS}>
              <Text style={text('label', t.colors.primary.base)}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
)}
    </View>
  );
}