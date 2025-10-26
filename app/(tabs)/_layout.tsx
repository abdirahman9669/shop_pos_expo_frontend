// app/(shell)/_layout.tsx
import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, space, layout } from '@/src/theme';
import DashboardHeader from '@/src/components/dashboard/owner/DashboardHeader';
import DashboardFooter from '@/src/components/dashboard/owner/DashboardFooter';
import SideDrawer from '@/src/components/dashboard/owner/SideDrawer';
import { useAuth } from '@/src/auth/AuthContext';
import { useRequireAuth } from '@/src/auth/useRequireAuth';



const HEADER_H = 56;
const FOOTER_H = 56;

// layering constants
const Z = {
  FOOTER: 10,
  HEADER: 20,
  DRAWER: 100, // must be > HEADER and > FOOTER
};

export default function ShellLayout() {
    // Auth + theme
  useRequireAuth();
  const { theme: t } = useTheme();
  const auth = useAuth();
  const insets = useSafeAreaInsets();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const shopName = auth?.shop?.name ?? 'My Shop';
  const userName = auth?.user?.username ?? 'user';
  const userRole = auth?.user?.role ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {/* Header (below drawer) */}
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: Z.HEADER }}
      >
        <View style={{ height: HEADER_H, justifyContent: 'center' }}>
          <DashboardHeader shopName={shopName} onMenu={() => setDrawerOpen(true)} />
        </View>
      </SafeAreaView>

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingTop: HEADER_H + insets.top,
          paddingBottom: FOOTER_H + insets.bottom,
          paddingHorizontal: layout.containerPadding,
        }}
      >
        <Slot />
      </View>

      {/* Footer (below drawer) */}
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
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

      {/* Drawer overlay (on top of everything) */}
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