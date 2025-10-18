// src/theme/motion.ts

import { EasingFunction, Easing } from 'react-native-reanimated';

export const motion = {
  duration: {
    fast: 100,
    normal: 200,
    slow: 300,
  },
  easing: {
    in: Easing.in(Easing.quad) as EasingFunction,
    out: Easing.out(Easing.quad) as EasingFunction,
    inOut: Easing.inOut(Easing.cubic) as EasingFunction,
  },
};
