// app/_layout.tsx
import { DarkTheme as NavDark, DefaultTheme as NavLight } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { themeFor } from '@/src/theme/tokens';
import { ThemeProvider as AppThemeProvider } from '@/src/theme/provider';
import { AuthProvider } from '@/src/auth/AuthContext';
import { PageActionsProvider } from '@/src/ux/PageActionsProvider';
import { ToastProvider } from '@/src/components/Toast';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const appTheme = themeFor(colorScheme === 'dark' ? 'dark' : 'light');

  const baseNav = appTheme.mode === 'dark' ? NavDark : NavLight;
  const navTheme = {
    ...baseNav,
    dark: appTheme.mode === 'dark',
    colors: {
      ...baseNav.colors,
      primary:      appTheme.colors.primary.base,
      background:   appTheme.colors.background,
      card:         appTheme.colors.surface,
      text:         appTheme.colors.textPrimary,
      border:       appTheme.colors.border,
      notification: appTheme.colors.danger.base,
    },
  };

  return (
    <AppThemeProvider initialMode={appTheme.mode}>
      <ToastProvider>
        <PageActionsProvider>
          <AuthProvider>
            {/* Everything goes through the (shell) group now */}
            <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }} />
            <StatusBar style={appTheme.mode === 'dark' ? 'light' : 'dark'} />
          </AuthProvider>
        </PageActionsProvider>
      </ToastProvider>
    </AppThemeProvider>
  );
}