import React, { useRef } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';

export default function Backdrop({ onPress }: { onPress: () => void }) {
  const BlurRef = useRef<any>(null);
  const tried = useRef(false);

  if (!tried.current && BlurRef.current === null) {
    tried.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('expo-blur');
      BlurRef.current = mod?.BlurView || null;
    } catch { BlurRef.current = null; }
  }
  const BlurView = BlurRef.current;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={StyleSheet.absoluteFill}
    >
      {BlurView ? (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
      )}
    </TouchableOpacity>
  );
}
