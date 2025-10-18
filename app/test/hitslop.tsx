// app/test/hitslop.tsx
import React from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensureMinTouchSize } from '@/src/ux/touchable';
import { Button } from '@/src/components'; // wherever your real Button is exported from
import { useAuth } from '@/src/auth/AuthContext';
// ...



export default function HitSlopDemo() {
    const { signOut } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {/* The *pressable* gets hitSlop */}
         <Button title="Sign out" onPress={signOut} />
        <TouchableOpacity
          onPress={() => Alert.alert('Pressed')}
          style={{
            width: 24,           // real size of the dot
            height: 24,
            borderRadius: 12,
            backgroundColor: 'black',
          }}
          // expand touch to at least 44x44
          hitSlop={ensureMinTouchSize(24, 24)}
        />
        <Text style={{ marginTop: 16, textAlign: 'center', paddingHorizontal: 24 }}>
          Try to tap *around* the small circle—should still trigger.
        </Text>
      </View>
    </SafeAreaView>
  );
}