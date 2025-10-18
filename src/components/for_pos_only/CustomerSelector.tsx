// src/components/CustomerSelector.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useTheme, text, space, radius, border } from '@/src/theme';

export type Customer = { id: string; name: string; phone?: string | null; priceLevel?: string | null };
export type CustomerSelectorProps = {
  fetchCustomers: (q: string) => Promise<Customer[]>;
  onPick: (c: Customer) => void;
  value?: Customer | null;
};

export function CustomerSelector({ fetchCustomers, onPick, value }: CustomerSelectorProps) {
  const { theme: t } = useTheme();
  const [q, setQ] = useState('');
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try { const data = await fetchCustomers(q.trim()); if (alive) setList(data); }
      catch { if (alive) setList([]); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [q]);

  return (
    <View style={{ gap: 6 }}>
      <Text style={text('label', t.colors.textSecondary)}>Customer</Text>
      {value ? (
        <View style={{ padding: 12, borderWidth: border.thin, borderColor: t.colors.border, borderRadius: radius.md }}>
          <Text style={text('body', t.colors.textPrimary)}>{value.name}</Text>
          {value.phone ? <Text style={text('caption', t.colors.textSecondary)}>{value.phone}</Text> : null}
        </View>
      ) : (
        <>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search name or phone…"
            placeholderTextColor={t.colors.textSecondary}
            style={{
              borderWidth: border.thin, borderColor: t.colors.border, borderRadius: radius.md,
              padding: 12, color: t.colors.textPrimary, backgroundColor: t.colors.surface3,
            }}
          />
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={list}
            keyExtractor={(i) => i.id}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onPick(item)}
                style={{ padding: 12, backgroundColor: t.colors.surface3, borderRadius: radius.md, borderWidth: border.thin, borderColor: t.colors.border }}
              >
                <Text style={text('body', t.colors.textPrimary)}>{item.name}</Text>
                {item.phone ? <Text style={text('caption', t.colors.textSecondary)}>{item.phone}</Text> : null}
                {item.priceLevel ? <Text style={text('caption', t.colors.info.base)}>Level: {item.priceLevel}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={text('caption', t.colors.textSecondary)}>{loading ? 'Loading…' : 'No results'}</Text>}
          />
        </>
      )}
    </View>
  );
}
