// app/sales/components/ScanSheet.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

type Feedback = { title: string; subtitle?: string; ok?: boolean } | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void; // parent does the lookup (like old page)
  feedback?: Feedback;               // parent banner (name + qty)
  beepSignal?: number;               // parent bump to play beep/haptic
};

export default function ScanSheet({
  visible,
  onClose,
  onScanned,
  feedback = null,
  beepSignal = 0,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [permissionAsked, setPermissionAsked] = useState(false);

  // Bottom banner (local, while parent computes)
  const [localBanner, setLocalBanner] = useState<Feedback>(null);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTempBanner = useCallback((fb: Feedback, ms = 900) => {
    setLocalBanner(fb);
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    localTimerRef.current = setTimeout(() => setLocalBanner(null), ms);
  }, []);

  // === SINGLE-SCAN LOCK to avoid double increments ===
  const scanLockRef = useRef<boolean>(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockScan = useCallback((ms = 700) => {
    scanLockRef.current = true;
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => { scanLockRef.current = false; }, ms);
  }, []);

  // De-dup by code for a short window (safety net)
  const lastHandledByCodeRef = useRef<Map<string, number>>(new Map());
  const dedupWindowMs = 1000;

  // Beep/haptic
  const soundRef = useRef<Audio.Sound | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Optional asset; if missing, no-op.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const src = require('@/app/assets/sounds/beep.mp3');
        const { sound } = await Audio.Sound.createAsync(src, { volume: 1.0, shouldPlay: false });
        if (mounted) soundRef.current = sound;
      } catch {
        soundRef.current = null;
      }
    })();
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  const doBeepAndHaptic = useCallback(async () => {
    try { await soundRef.current?.replayAsync(); } catch {}
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }, []);

  // Trigger feedback from parent signals (beep/haptic happens AFTER parent adds)
  const lastBeep = useRef<number>(beepSignal);
  useEffect(() => {
    if (!visible) return;
    if (beepSignal !== lastBeep.current) {
      lastBeep.current = beepSignal;
      doBeepAndHaptic();
    }
  }, [beepSignal, doBeepAndHaptic, visible]);

  // Show banner when parent sends feedback (bottom)
  const prevFeedback = useRef<Feedback>(null);
  useEffect(() => {
    if (!visible) return;
    if (feedback && feedback !== prevFeedback.current) {
      prevFeedback.current = feedback;
      setTempBanner(feedback, 1300);
    }
  }, [feedback, setTempBanner, visible]);

  // Ask for camera permission on open
  useEffect(() => {
    if (visible && !permission?.granted && !permissionAsked) {
      setPermissionAsked(true);
      requestPermission();
    }
  }, [visible, permission?.granted, permissionAsked, requestPermission]);

  const handleBarcode = useCallback((raw: string | number | undefined | null) => {
    if (scanLockRef.current) return; // HARD lock: strictly one scan -> one increment

    const code = String(raw ?? '').trim();
    if (!code) return;

    const now = Date.now();
    const last = lastHandledByCodeRef.current.get(code) || 0;
    if (now - last < dedupWindowMs) return; // ignore same code within window
    lastHandledByCodeRef.current.set(code, now);

    // Lock immediately to prevent a second callback increment
    lockScan(700);

    // Provisional bottom banner immediately
    setTempBanner({ title: `Scanned: ${code}`, subtitle: 'Adding…', ok: true }, 700);

    // Parent does the lookup + add (will send proper banner + beep)
    onScanned(code);
  }, [lockScan, setTempBanner, onScanned]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        {!permission?.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Text>We need camera access to scan barcodes.</Text>
            <TouchableOpacity
              onPress={requestPermission}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 }}
            >
              <Text>Grant permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 }}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              onBarcodeScanned={(e) => handleBarcode(e?.data)}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13', 'ean8',
                  'code128', 'code39', 'code93',
                  'upc_e', 'upc_a',
                  'itf14', 'codabar',
                ],
              }}
            />

            {/* Bottom feedback banner (with space above Close button) */}
            {(localBanner || feedback) && (
              <View
                pointerEvents="none"
                style={[
                  styles.banner,
                  (localBanner ?? feedback)?.ok === false ? styles.bannerErr : styles.bannerOk,
                ]}
              >
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  {(localBanner ?? feedback)?.title}
                </Text>
                {!!(localBanner ?? feedback)?.subtitle && (
                  <Text style={styles.bannerSub} numberOfLines={1}>
                    {(localBanner ?? feedback)?.subtitle}
                  </Text>
                )}
              </View>
            )}

            {/* Close button */}
            <View style={styles.closeWrap}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Move banner to bottom with comfy gap above Close button
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 90, // space above the Close button (which sits at bottom:24)
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  bannerOk: { backgroundColor: 'rgba(18,183,106,0.92)' },
  bannerErr: { backgroundColor: 'rgba(239,68,68,0.95)' },
  bannerTitle: { color: '#fff', fontWeight: '900' },
  bannerSub: { color: '#f1f5f9', fontWeight: '700', marginTop: 2 },

  closeWrap: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  closeBtn: { backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
});