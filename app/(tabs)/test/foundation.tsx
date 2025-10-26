// app/theme-preview.tsx
import React, { useMemo, useRef } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, StyleSheet,
  TouchableOpacity, Animated
} from 'react-native';
import { Stack } from 'expo-router';
import {
  useTheme, motion, elevation, space, radius, border, text, icon, layout,
} from '@/src/theme';

export default function ThemePreview() {
  const { theme: t, mode, setMode, toggleLightDark, resolvedMode } = useTheme();

  // Simple motion demo
  const pulse = useRef(new Animated.Value(1)).current;
  const startPulse = () => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: motion.duration.normal, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.00, duration: motion.duration.normal, useNativeDriver: true }),
    ]).start();
  };

  const ColorSwatch = ({ title, color, on }: { title: string; color: string; on?: string }) => (
    <View style={[styles.swatch, { backgroundColor: color, borderColor: t.colors.border }]}>
      <Text style={text('label', on || t.colors.textPrimary)}>{title}</Text>
    </View>
  );

  const Card = ({ children, elev = 1 }: { children: React.ReactNode; elev?: 0|1|2|3|4 }) => (
    <View style={[styles.card, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }, elevation[elev]]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Theme Preview',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTitleStyle: { color: t.colors.textPrimary },
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }]}
                onPress={() => setMode('system')}
              >
                <Text style={text('label', t.colors.textPrimary)}>System</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: t.colors.primary.base }]}
                onPress={toggleLightDark}
              >
                <Text style={text('label', t.colors.primary.onBase)}>{resolvedMode === 'light' ? 'Dark' : 'Light'}</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: layout.containerPadding, gap: space.lg }}>
        <Card elev={1}>
          <Text style={text('h1', t.colors.textPrimary)}>Mode: {mode} → resolved: {resolvedMode}</Text>
          <Text style={text('bodySm', t.colors.textSecondary)}>
            “System” follows device appearance automatically.
          </Text>
        </Card>

        {/* Typography */}
        <Card elev={1}>
          <Text style={text('h2', t.colors.textPrimary)}>Typography</Text>
          <View style={{ height: space.sm }} />
          <Text style={text('h1', t.colors.textPrimary)}>Heading H1</Text>
          <Text style={text('h2', t.colors.textPrimary)}>Heading H2</Text>
          <Text style={text('h3', t.colors.textPrimary)}>Heading H3</Text>
          <Text style={text('bodyLg', t.colors.textSecondary)}>Body Large — secondary color for long copy.</Text>
          <Text style={text('body', t.colors.textPrimary)}>Body — regular paragraph text.</Text>
          <Text style={text('bodySm', t.colors.textSecondary)}>Body Small — helper text.</Text>
          <Text style={text('caption', t.colors.textSecondary)}>Caption</Text>
          <Text style={text('label', t.colors.textPrimary)}>Label</Text>
        </Card>

        {/* Colors */}
        <Card elev={1}>
          <Text style={text('h2', t.colors.textPrimary)}>Colors</Text>
          <View style={{ height: space.md }} />
          <View style={styles.row}>
            <ColorSwatch title="Primary.base" color={t.colors.primary.base} on={t.colors.primary.onBase} />
            <ColorSwatch title="Primary.surface" color={t.colors.primary.surface} on={t.colors.primary.onSurface} />
            <ColorSwatch title="Secondary.base" color={t.colors.secondary.base} on={t.colors.secondary.onBase} />
          </View>
          <View style={{ height: space.sm }} />
          <View style={styles.row}>
            <ColorSwatch title="Success" color={t.colors.success.base} on={t.colors.success.onBase} />
            <ColorSwatch title="Warning" color={t.colors.warning.base} on={t.colors.warning.onBase} />
            <ColorSwatch title="Danger"  color={t.colors.danger.base}  on={t.colors.danger.onBase} />
            <ColorSwatch title="Info"    color={t.colors.info.base}    on={t.colors.info.onBase} />
          </View>
        </Card>

        {/* Buttons + Motion */}
        <Card elev={2}>
          <Text style={text('h2', t.colors.textPrimary)}>Buttons & Motion</Text>
          <View style={{ height: space.md }} />
          <View style={styles.row}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, { backgroundColor: t.colors.primary.base, borderRadius: radius.md }, elevation[1]]}
            >
              <Text style={text('label', t.colors.primary.onBase)}>Primary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.btn, { backgroundColor: t.colors.secondary.base, borderRadius: radius.md }, elevation[1]]}
            >
              <Text style={text('label', t.colors.secondary.onBase)}>Secondary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled
              style={[styles.btn, { backgroundColor: t.colors.primary.base, opacity: t.states.disabled, borderRadius: radius.md }]}
            >
              <Text style={text('label', t.colors.primary.onBase)}>Disabled</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: space.md }} />
          <Animated.View style={[styles.btn, { backgroundColor: t.colors.info.base, borderRadius: radius.pill, transform: [{ scale: pulse }] }]}>
            <TouchableOpacity onPress={startPulse} activeOpacity={0.85}>
              <Text style={text('label', t.colors.info.onBase)}>Tap to Animate ({motion.duration.normal}ms)</Text>
            </TouchableOpacity>
          </Animated.View>
        </Card>

        {/* Elevation */}
        <Card elev={0}>
          <Text style={text('h2', t.colors.textPrimary)}>Elevation</Text>
          <View style={{ height: space.md }} />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {[0,1,2,3,4].map((lvl) => (
              <View
                key={lvl}
                style={[styles.elevBox, { backgroundColor: t.colors.surface3, borderColor: t.colors.border }, elevation[lvl as 0|1|2|3|4]]}
              >
                <Text style={text('caption', t.colors.textSecondary)}>elev {lvl}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Spacing / Radius */}
        <Card elev={1}>
          <Text style={text('h2', t.colors.textPrimary)}>Spacing / Radius / Border</Text>
          <View style={{ height: space.md }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: 40, height: 40, backgroundColor: t.colors.primary.surface, borderRadius: radius.sm, borderWidth: border.thin, borderColor: t.colors.primary.border }} />
            <View style={{ width: 40, height: 40, backgroundColor: t.colors.primary.surface, borderRadius: radius.md, borderWidth: border.thick, borderColor: t.colors.primary.border }} />
            <View style={{ width: 40, height: 40, backgroundColor: t.colors.primary.surface, borderRadius: radius.lg, borderWidth: border.thin, borderColor: t.colors.primary.border }} />
            <View style={{ width: 80, height: 24, backgroundColor: t.colors.primary.surface, borderRadius: radius.pill, borderWidth: border.thin, borderColor: t.colors.primary.border }} />
          </View>
          <View style={{ height: space.md }} />
          <Text style={text('bodySm', t.colors.textSecondary)}>Grid: {space.xs}/{space.sm}/{space.md}/{space.lg}/{space.xl}</Text>
        </Card>

        {/* Icons */}
        <Card elev={1}>
          <Text style={text('h2', t.colors.textPrimary)}>Icon Sizes</Text>
          <View style={{ height: space.md }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
            <View style={[styles.iconBox, { width: icon.size.xs, height: icon.size.xs, backgroundColor: t.colors.neutral.base }]} />
            <View style={[styles.iconBox, { width: icon.size.sm, height: icon.size.sm, backgroundColor: t.colors.primary.base }]} />
            <View style={[styles.iconBox, { width: icon.size.md, height: icon.size.md, backgroundColor: t.colors.secondary.base }]} />
            <View style={[styles.iconBox, { width: icon.size.lg, height: icon.size.lg, backgroundColor: t.colors.info.base }]} />
          </View>
          <Text style={text('caption', t.colors.textSecondary)}>Stroke recommendation: {icon.stroke}px</Text>
        </Card>

        {/* Layout */}
        <Card elev={1}>
          <Text style={text('h2', t.colors.textPrimary)}>Layout</Text>
          <View style={{ height: space.md }} />
          <Text style={text('body', t.colors.textPrimary)}>containerPadding: {layout.containerPadding}px</Text>
          <Text style={text('body', t.colors.textPrimary)}>gutter: {layout.gutter}px</Text>
          <Text style={text('body', t.colors.textPrimary)}>cardPadding: {layout.cardPadding}px</Text>
          <Text style={text('body', t.colors.textPrimary)}>maxContentWidth: {layout.maxContentWidth}px</Text>
          <Text style={text('body', t.colors.textPrimary)}>minTapSize: {layout.minTapSize}px</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    minWidth: 130, height: 56, borderWidth: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  elevBox: { width: 70, height: 56, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  iconBox: { borderRadius: 8 },
});
