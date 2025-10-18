// src/theme/typography.ts

import { TextStyle } from 'react-native';

export type TypeToken =
  | 'h1' | 'h2' | 'h3'
  | 'bodyLg' | 'body' | 'bodySm'
  | 'caption' | 'label';

const fontFamilyStack = {
  regular: 'System', // swap to "Inter_400Regular" if you load custom
  medium:  'System',
  bold:    'System',
};

export const typeScale: Record<TypeToken, TextStyle> = {
  h1:      { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: 0.2, fontFamily: fontFamilyStack.bold },
  h2:      { fontSize: 24, lineHeight: 32, fontWeight: '600', letterSpacing: 0.2, fontFamily: fontFamilyStack.medium },
  h3:      { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: 0.1, fontFamily: fontFamilyStack.medium },

  bodyLg:  { fontSize: 18, lineHeight: 26, fontWeight: '400', letterSpacing: 0.2, fontFamily: fontFamilyStack.regular },
  body:    { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.2, fontFamily: fontFamilyStack.regular },
  bodySm:  { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0.1, fontFamily: fontFamilyStack.regular },

  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.3, fontFamily: fontFamilyStack.medium },
  label:   { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.4, fontFamily: fontFamilyStack.medium },
};

// Helper to compose a text style with color
export const text = (token: TypeToken, color: string): TextStyle => ({
  ...typeScale[token],
  color,
});
