// app/auth/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, text, radius, space, border } from '@/src/theme';
import { ensureMinTouchSize } from '@/src/ux/touchable';
import { useAuth } from '@/src/auth/AuthContext';
import { Button } from '@/src/components'; // your design-system Button

export default function LoginScreen() {
  const { theme: t } = useTheme();
  const { signIn, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('owner123');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!username || !password) {
      Alert.alert('Missing info', 'Please enter username and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(username.trim(), password);
      router.replace('/'); // or '/(tabs)'
    } catch (e: any) {
      Alert.alert('Login failed', e?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ padding: 20, gap: 16 }}>
        <Text style={text('h2', t.colors.textPrimary)}>Welcome back</Text>
        <Text style={text('body', t.colors.textSecondary)}>
          Sign in to continue to your shop.
        </Text>

        {/* Username */}
        <View>
          <Text style={text('label', t.colors.textSecondary)}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="owner"
            placeholderTextColor={t.colors.textSecondary}
            accessibilityLabel="Username"
            style={{
              marginTop: 6,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderWidth: border.thin,
              borderColor: t.colors.border,
              borderRadius: radius.md,
              color: t.colors.textPrimary,
              backgroundColor: t.colors.surface3,
            }}
          />
        </View>

        {/* Password */}
        <View>
          <Text style={text('label', t.colors.textSecondary)}>Password</Text>
          <View
            style={{
              marginTop: 6,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: border.thin,
              borderColor: t.colors.border,
              borderRadius: radius.md,
              backgroundColor: t.colors.surface3,
            }}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              placeholder="••••••••"
              placeholderTextColor={t.colors.textSecondary}
              accessibilityLabel="Password"
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: t.colors.textPrimary,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPw(s => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
              hitSlop={ensureMinTouchSize(24, 24)}
              style={{ paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <Text style={text('label', t.colors.primary.base)}>
                {showPw ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary action (ONE per screen) */}
        <Button
          title="Sign In"
          onPress={onSubmit}
          loading={busy || loading}
          disabled={busy || loading}
          fullWidth
          testID="login-primary"
        />

        {/* Secondary: for later (forgot password, etc.) */}
        {/* <Button title="Need help?" variant="ghost" onPress={() => {}} /> */}
      </View>
    </SafeAreaView>
  );
}
