// app/auth/login.tsx
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth/AuthContext';
import { Button, TextField, Card } from '@/src/components';
import { useTheme, space, layout } from '@/src/theme';

export default function LoginScreen() {
  const { theme: t } = useTheme();
  const { signIn, loading } = useAuth();

  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('owner123');
  const [shopCode, setShopCode] = useState('AA01');         // optional
  const [phoneNumber, setPhoneNumber] = useState('');       // optional

  async function onSubmit() {
    try {
      if (!shopCode && !phoneNumber) {
        Alert.alert('Missing info', 'Provide either shop code or phone number.');
        return;
      }
      await signIn({
        username: username.trim(),
        password,
        shop_code: shopCode?.trim() || null,
        phone_number: phoneNumber?.trim() || null,
      });
      // navigation will be handled by your app flow after AuthProvider state updates
    } catch (e: any) {
      Alert.alert('Login failed', e?.message || 'Please check your credentials.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ padding: layout.containerPadding }}>
        <Card>
          <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <View style={{ height: space.sm }} />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <View style={{ height: space.sm }} />
          <TextField
            label="Shop Code (optional)"
            value={shopCode}
            onChangeText={setShopCode}
            placeholder="e.g. AA01"
            autoCapitalize="characters"
          />
          <View style={{ height: space.xs }} />
          <TextField
            label="Phone Number (optional)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+252..."
            keyboardType="phone-pad"
          />
          <View style={{ height: space.md }} />
          <Button title={loading ? 'Signing in…' : 'Sign in'} onPress={onSubmit} disabled={loading} />
        </Card>
      </View>
    </SafeAreaView>
  );
}
