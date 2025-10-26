import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';

export default function ExchangeIndex() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Exchange',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/exchange/new' as const)} style={s.headerBtn}>
              <Text style={s.headerBtnTxt}>+ New</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={{ padding: 16 }}>
        <Text style={{ fontWeight: '700', color: '#666' }}>
          Use “+ New” to record a USD↔SOS exchange.
        </Text>
        {/* Later: list EXCHANGE journals via /api/journals?reference_type=EXCHANGE */}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  headerBtnTxt: { color: '#fff', fontWeight: '800' },
});