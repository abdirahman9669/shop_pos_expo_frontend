// src/theme/elevation.ts

import { Platform, ViewStyle } from 'react-native';

export type ElevationLevel = 0 | 1 | 2 | 3 | 4;

type ElevationMap = Record<ElevationLevel, ViewStyle>;

export const elevation: ElevationMap = {
  0: { ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }) },
  1: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    android: { elevation: 2 },
  })!,
  2: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
    android: { elevation: 4 },
  })!,
  3: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16 },
    android: { elevation: 8 },
  })!,
  4: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.20, shadowRadius: 24 },
    android: { elevation: 16 },
  })!,
};
