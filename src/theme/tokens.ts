// src/theme/tokens.ts

import { lightColors, darkColors, SemanticColors, Mode, stateOpacity } from './colors';
import { typeScale } from './typography';
import { space, radius, border } from './spacing';
import { elevation } from './elevation';
import { motion } from './motion';
import { icon } from './icons';
import { layout } from './layout';

export type Theme = {
  mode: Mode;
  colors: SemanticColors;
  type: typeof typeScale;
  space: typeof space;
  radius: typeof radius;
  border: typeof border;
  elevation: typeof elevation;
  motion: typeof motion;
  icon: typeof icon;
  layout: typeof layout;
  states: typeof stateOpacity;
};

export const themeFor = (mode: Mode = 'light'): Theme => ({
  mode,
  colors: mode === 'dark' ? darkColors : lightColors,
  type: typeScale,
  space,
  radius,
  border,
  elevation,
  motion,
  icon,
  layout,
  states: stateOpacity,
});


// Convenience: a default theme (light)
export const theme = themeFor('light');
