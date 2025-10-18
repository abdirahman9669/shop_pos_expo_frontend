// app/sales/components/CustomerChooser.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

export type Customer = { id: string; name: string; phone?: string | null };

type Props = {
  label?: string;
  value: string;                       // what shows in the input (customer?.name or query)
  open: boolean;                       // whether popup list is visible
  loading: boolean;
  results: Customer[];
  onChange: (text: string) => void;    // user types -> parent updates query & setOpen
  onFocus?: () => void;
  onPick: (c: Customer) => void;       // user selects a customer
};

export default function CustomerChooser({
  label = 'Customer',
  value,
  open,
  loading,
  results,
  onChange,
  onFocus,
  onPick,
}: Props) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        placeholder="Type customer name/phone…"
        style={s.input}
      />

      {open && (
        <View style={s.popup}>
          {loading ? (
            <View style={{ padding: 10 }}>
              <ActivityIndicator />
            </View>
          ) : results.length ? (
            results.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={s.item}
                onPress={() => onPick(c)}
              >
                <Text style={{ fontWeight: '800' }}>{c.name}</Text>
                {c.phone ? <Text style={{ color: '#666' }}>{c.phone}</Text> : null}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ padding: 10, color: '#777' }}>No matches</Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontWeight: '700', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'white',
  },
  popup: {
    position: 'absolute',
    top: 70, // adjust if your page spacing is different
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    zIndex: 20,
    maxHeight: 280,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
});