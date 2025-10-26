// src/components/navigation/SideDrawer.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, text, space, layout } from '@/src/theme';
import { useCapabilities } from '@/src/hooks/useCapabilities';
import { useAuth } from '@/src/auth/AuthContext';

function RowItem({
  label,
  icon,
  onPress,
  disabled,
  right,
  testID,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  right?: React.ReactNode;
  testID?: string;
}) {
  const { theme: t } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: t.colors.border as string }}
      style={({ pressed }) => ({
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 10,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        {icon}
        <Text style={text('body', t.colors.textPrimary)} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {right ?? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={t.colors.textSecondary as string}
        />
      )}
    </Pressable>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  shopName?: string;
  userName?: string;
  userRole?: string;
};

export default function SideDrawer({
  open,
  onClose,
  shopName,
  userName,
  userRole,
}: Props) {
  const { signOut } = useAuth();
  const { theme: t } = useTheme();
  const { can } = useCapabilities();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // slide anim
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  });
  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  const closeThen = (fn?: () => void) => () => {
    onClose();
    fn?.();
  };

  const initials =
    (userName || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <>
      {/* overlay */}
      <Pressable
        onPress={onClose}
        pointerEvents={open ? 'auto' : 'none'}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <Animated.View
          style={{
            flex: 1,
            opacity: overlayOpacity,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        />
      </Pressable>

      {/* drawer */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 300,
          transform: [{ translateX }],
          backgroundColor: t.colors.surface,
          borderRightWidth: 1,
          borderRightColor: t.colors.border,
          paddingTop: insets.top || 12,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        {/* header */}
        <View
          style={{
            paddingHorizontal: layout.containerPadding,
            paddingBottom: space.md,
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.primary.base,
              }}
            >
              <Text style={text('h3', t.colors.primary.onBase)}>{initials}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={text('label', t.colors.textSecondary)}
                numberOfLines={1}
              >
                {userRole || '—'}
              </Text>
              <Text style={text('h3', t.colors.textPrimary)} numberOfLines={1}>
                {userName || 'User'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name="storefront-outline"
                  size={14}
                  color={t.colors.textSecondary as string}
                />
                <Text
                  style={text('caption', t.colors.textSecondary)}
                  numberOfLines={1}
                >
                  {shopName || 'Shop'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* content */}
        <ScrollView
          contentContainerStyle={{
            padding: layout.containerPadding,
            paddingBottom: (insets.bottom || 12) + 8,
            gap: 8,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* General */}
          <Text style={text('label', t.colors.textSecondary)}>General</Text>
          <View
            style={{
              backgroundColor: t.colors.background,
              borderRadius: 12,
              padding: 6,
              borderWidth: 1,
              borderColor: t.colors.border,
              gap: 6,
            }}
          >
            <RowItem
              label="Home"
              icon={
                <Ionicons
                  name="home-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/'))}
            />
            <RowItem
              label="My Profile"
              icon={
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/'))}
            />
            <RowItem
              label="Reports"
              icon={
                <Ionicons
                  name="bar-chart-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/'))}
            />
          </View>

          {/* Operations */}
          <Text
            style={[text('label', t.colors.textSecondary), { marginTop: space.sm }]}
          >
            Operations
          </Text>
          <View
            style={{
              backgroundColor: t.colors.background,
              borderRadius: 12,
              padding: 6,
              borderWidth: 1,
              borderColor: t.colors.border,
              gap: 6,
            }}
          >
            <RowItem
              label="Create Product"
              icon={
                <MaterialCommunityIcons
                  name="cube-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/'))}
            />
            <RowItem
              label="New Sale"
              icon={
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/sales/screens/NewSale'))}
            />
            {can('purchases:new') && (
              <RowItem
                label="New Purchase"
                icon={
                  <Ionicons
                    name="cart-outline"
                    size={20}
                    color={t.colors.textSecondary as string}
                  />
                }
                onPress={closeThen(() => router.push('/(tabs)/purchases/new'))}
              />
            )}
            <RowItem
              label="Returns"
              icon={
                <Ionicons
                  name="arrow-undo-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/returns/new'))}
            />
            <RowItem
              label="Barcodes Manager"
              icon={
                <MaterialCommunityIcons
                  name="barcode-scan"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/barcodes/lookup'))}
            />
          </View>

          {/* Inventory & Partners */}
          <Text
            style={[text('label', t.colors.textSecondary), { marginTop: space.sm }]}
          >
            Inventory & Partners
          </Text>
          <View
            style={{
              backgroundColor: t.colors.background,
              borderRadius: 12,
              padding: 6,
              borderWidth: 1,
              borderColor: t.colors.border,
              gap: 6,
            }}
          >
            <RowItem
              label="Stores"
              icon={
                <MaterialCommunityIcons
                  name="store-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/stores'))}
            />
            <RowItem
              label="Suppliers"
              icon={
                <MaterialCommunityIcons
                  name="truck-delivery-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/suppliers'))}
            />
          </View>

          {/* Finance */}
          <Text
            style={[text('label', t.colors.textSecondary), { marginTop: space.sm }]}
          >
            Finance
          </Text>
          <View
            style={{
              backgroundColor: t.colors.background,
              borderRadius: 12,
              padding: 6,
              borderWidth: 1,
              borderColor: t.colors.border,
              gap: 6,
            }}
          >
            <RowItem
              label="Cash Sessions"
              icon={
                <MaterialCommunityIcons
                  name="cash-register"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/cash-sessions'))}
            />
            <RowItem
              label="Payments"
              icon={
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/payments'))}
            />
            <RowItem
              label="Customers — Receivables"
              icon={
                <MaterialCommunityIcons
                  name="account-cash-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/customers/receivables'))}
            />
            <RowItem
              label="Exchange"
              icon={
                <Ionicons
                  name="swap-horizontal"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/exchange'))}
            />
            <RowItem
              label="Exchange Rates"
              icon={
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/exchange-rates'))}
            />
            <RowItem
                label="Accounts"
                icon={
                    <MaterialCommunityIcons
                    name="account-group-outline"
                    size={20}
                    color={t.colors.textSecondary as string}
                    />
                }
                onPress={closeThen(() => router.push('/account-types'))}
                />
            <RowItem
              label="Journals"
              icon={
                <MaterialCommunityIcons
                  name="notebook-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/journals'))}
            />
          </View>

          {/* Admin */}
          <Text
            style={[text('label', t.colors.textSecondary), { marginTop: space.sm }]}
          >
            Admin
          </Text>
          <View
            style={{
              backgroundColor: t.colors.background,
              borderRadius: 12,
              padding: 6,
              borderWidth: 1,
              borderColor: t.colors.border,
              gap: 6,
            }}
          >
            <RowItem
              label="Shops"
              icon={
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/admin/shops'))}
            />
            <RowItem
              label="Owner — User Capabilities"
              icon={
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/owner/users'))}
            />
            <RowItem
              label="Capabilities Registry"
              icon={
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={t.colors.textSecondary as string}
                />
              }
              onPress={closeThen(() => router.push('/admin/capabilities/ListAndCreate'))}
            />
          </View>

          <View style={{ height: space.sm }} />

          {/* Logout card */}
          <View
            style={{
              backgroundColor: t.colors.surface,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: t.colors.border,
              alignItems: 'center',
            }}
          >
            <Pressable
              onPress={closeThen(() => signOut())}
              android_ripple={{ color: t.colors.border as string }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                opacity: pressed ? 0.7 : 1,
                width: '100%',
              })}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={t.colors.danger.base as string}
              />
              <Text style={text('label', t.colors.danger.base)}>Logout</Text>
            </Pressable>
            <Text
              style={[text('caption', t.colors.textSecondary), { marginTop: 6 }]}
            >
              v1.0.0
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}