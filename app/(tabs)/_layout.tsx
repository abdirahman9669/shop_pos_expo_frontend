import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, layout } from '@/src/theme';
import DashboardHeader from '@/src/components/dashboard/owner/DashboardHeader';
import DashboardFooter from '@/src/components/dashboard/owner/DashboardFooter';
import SideDrawer from '@/src/components/dashboard/owner/SideDrawer';
import { useAuth } from '@/src/auth/AuthContext';
import { useRequireAuth } from '@/src/auth/useRequireAuth';

const HEADER_H = 56;
const FOOTER_H = 56;
const Z = { FOOTER: 10, HEADER: 20, DRAWER: 100 };

export default function ShellLayout() {
  useRequireAuth();
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const shopName = auth?.shop?.name ?? 'My Shop';
  const userName = auth?.user?.username ?? 'user';
  const userRole = auth?.user?.role ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Navigator for all (shell) screens – gives us native gestures */}
      <Stack
        screenOptions={{
          // render our header via the navigator
          header: () => (
            <SafeAreaView
              edges={['top', 'left', 'right']}
              style={{ backgroundColor: t.colors.surface, zIndex: Z.HEADER }}
            >
              <View style={{ height: HEADER_H, justifyContent: 'center' }}>
                <DashboardHeader shopName={shopName} onMenu={() => setDrawerOpen(true)} />
              </View>
            </SafeAreaView>
          ),
          headerTransparent: true, // we add padding below so content won't hide
          contentStyle: {
            backgroundColor: t.colors.background,
            paddingTop: HEADER_H + insets.top,
            paddingBottom: FOOTER_H + insets.bottom,
            paddingHorizontal: layout.containerPadding,
          },
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          gestureResponseDistance: {start: 80}, // generous swipe area
        }}
      />

      {/* Footer (absolute, below navigator content) */}
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        pointerEvents="box-none"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: Z.FOOTER }}
      >
        <View style={{ height: FOOTER_H, justifyContent: 'center' }}>
          <DashboardFooter
            items={[
              { label: 'Home', route: '/' },
              { label: 'Spendings', route: '/reports/spendings' },
              { label: 'History', route: '/history' },
              { label: 'Pay', route: '/pay' },
              { label: 'Offers', route: '/offers' },
              { label: 'My QR', route: '/products' },
              { label: 'Legend', route: '/test/legend' },
            ]}
          />
        </View>
      </SafeAreaView>

      {/* Drawer overlay */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: Z.DRAWER }}
      >
        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          shopName={shopName}
          userName={userName}
          userRole={userRole}
        />
      </View>
    </View>
  );
}