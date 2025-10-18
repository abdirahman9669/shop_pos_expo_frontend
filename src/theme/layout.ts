// src/theme/layout.ts

import { space } from './spacing';

export const layout = {
  containerPadding: space.md, // page container inner padding
  sectionPadding: space.sm,
  cardPadding: space.sm,
  gutter: space.md,           // horizontal spacing between columns
  maxContentWidth: 1280,
  minTapSize: 44,
} as const;
