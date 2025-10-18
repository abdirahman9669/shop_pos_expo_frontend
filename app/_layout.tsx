// app/_layout.tsx
import {
  DarkTheme as NavDark,
  DefaultTheme as NavLight,
  Theme as NavThemeType,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { themeFor } from '@/src/theme/tokens';
import { ThemeProvider as AppThemeProvider } from '@/src/theme/provider';

// ✅ Only import ToastProvider (no viewport)
import { ToastProvider } from '@/src/components/Toast';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appTheme = themeFor(colorScheme === 'dark' ? 'dark' : 'light');

  const baseNav = appTheme.mode === 'dark' ? NavDark : NavLight;
  const navTheme: NavThemeType = {
    ...baseNav,
    dark: appTheme.mode === 'dark',
    colors: {
      ...baseNav.colors,
      // NOTE: our tokens live under .color (not .colors)
      primary:      appTheme.colors.primary.base,
      background:   appTheme.colors.background,
      card:         appTheme.colors.surface,
      text:         appTheme.colors.textPrimary,
      border:       appTheme.colors.border,
      notification: appTheme.colors.danger.base,
    },
  };

  return (
    <AppThemeProvider initialMode={colorScheme === 'dark' ? 'dark' : 'light'}>
      <ToastProvider>
        <NavThemeProvider value={navTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="account-types" options={{ title: 'Account Types' }} />
            <Stack.Screen name="account-type/[id]" options={{ title: 'Account Type' }} />
            <Stack.Screen name="theme-preview" options={{ title: 'Theme Preview' }} />
          </Stack>
          <StatusBar style={appTheme.mode === 'dark' ? 'light' : 'dark'} />
        </NavThemeProvider>
      </ToastProvider>
    </AppThemeProvider>
  );
}