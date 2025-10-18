import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTheme, text, elevation, radius, space } from '@/src/theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';

export type ToastOptions = {
  message: string;
  tone?: Tone;
  durationMs?: number;   // default 2200
};

type ToastContextType = { show: (opts: ToastOptions) => void };

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme: t } = useTheme();
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ToastOptions>({ message: '', tone: 'neutral' });
  const y = useRef(new Animated.Value(-80)).current;

  const show = useCallback((o: ToastOptions) => {
    setOpts({ tone: 'neutral', durationMs: 2200, ...o });
    setVisible(true);
    Animated.timing(y, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(y, { toValue: -80, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setVisible(false));
      }, (o.durationMs ?? 2200));
    });
  }, [y]);

  const value = useMemo(() => ({ show }), [show]);

  if (!visible) {
    return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
  }

  const tone = t.colors[opts.tone ?? 'neutral'];

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.wrap,
            { transform: [{ translateY: y }] },
          ]}
        >
          <View style={[styles.toast, elevation[2], { backgroundColor: tone.base, borderRadius: radius.lg }]}>
            <Text style={text('label', tone.onBase)}>{opts.message}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() must be used within <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: space.lg },
  toast: { paddingHorizontal: 16, paddingVertical: 12 },
});
