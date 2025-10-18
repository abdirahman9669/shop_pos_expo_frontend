// src/theme/colors.ts

export type SemanticColorSet = {
  base: string;         // default
  onBase: string;       // text/icon on top of base
  surface: string;      // containers/cards using this color
  onSurface: string;    // text/icon on top of surface
  border: string;       // strokes using this color
};

export type SemanticRole =
  | 'primary' | 'secondary'
  | 'success' | 'warning' | 'danger' | 'info'
  | 'neutral';

export type Mode = 'light' | 'dark';

export type SemanticColors = Record<SemanticRole, SemanticColorSet> & {
  // Neutral text/background tokens
  background: string;
  surface: string;
  surface2: string;
  surface3: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  border: string;
  overlay: string; // scrims
};

//
// Brand palette (you can tweak hexes later without refactoring components)
//
const brand = {
  // Teal-blue primary range
  primary50:  '#E9F7F6',
  primary100: '#CFF0EE',
  primary200: '#A0E1DC',
  primary300: '#6BCFC7',
  primary400: '#41BDB3',
  primary500: '#1FAAA0', // main
  primary600: '#158E86',
  primary700: '#10736C',
  primary800: '#0C5853',
  primary900: '#083E3A',

  // Mint/blue-gray secondary
  secondary50:  '#EEF6F8',
  secondary100: '#D6E9EE',
  secondary200: '#B7D6DF',
  secondary300: '#92BDC9',
  secondary400: '#74A8B7',
  secondary500: '#5E94A5', // main
  secondary600: '#4B7885',
  secondary700: '#3C5F69',
  secondary800: '#2F4A52',
  secondary900: '#22363C',

  // Status
  green500: '#22A06B',
  orange500:'#F39C38',
  red500:   '#D84E4E',
  blue500:  '#3C8DFF',

  // Neutrals
  gray50:  '#FFFFFF',
  gray75:  '#FAFAFA',
  gray100: '#F5F6F7',
  gray200: '#ECEEF0',
  gray300: '#E1E4E8',
  gray400: '#C7CCD1',
  gray500: '#9AA3AB',
  gray600: '#6E7A83',
  gray700: '#4A545B',
  gray800: '#2E353A',
  gray900: '#121417',
  black:   '#0A0B0C',
};

export const lightColors: SemanticColors = {
  // neutrals & surfaces
  background: brand.gray50,
  surface: brand.gray100,
  surface2: brand.gray75,
  surface3: '#FFFFFF',
  textPrimary: brand.gray900,
  textSecondary: brand.gray600,
  textDisabled: '#9AA3AB99',
  border: brand.gray300,
  overlay: 'rgba(18,20,23,0.45)',

  // semantic roles
  primary:   { base: brand.primary500, onBase: '#FFFFFF', surface: '#EAF6F5', onSurface:'#0C5853', border: brand.primary300 },
  secondary: { base: brand.secondary500, onBase: '#FFFFFF', surface: '#EDF4F6', onSurface:'#2F4A52', border: brand.secondary300 },
  success:   { base: brand.green500, onBase: '#FFFFFF', surface: '#EDF8F3', onSurface:'#11573B', border: '#BFE8D6' },
  warning:   { base: brand.orange500, onBase: '#1E1305', surface: '#FFF6EA', onSurface:'#7A4D14', border: '#FFD9A8' },
  danger:    { base: brand.red500, onBase: '#FFFFFF', surface: '#FFF0F0', onSurface:'#6C1E1E', border: '#F5B7B7' },
  info:      { base: brand.blue500, onBase: '#FFFFFF', surface: '#EEF5FF', onSurface:'#17315C', border: '#BFD5FF' },
  neutral:   { base: brand.gray600, onBase: '#FFFFFF', surface: brand.gray100, onSurface: brand.gray800, border: brand.gray300 },
};

export const darkColors: SemanticColors = {
  background: brand.gray900,
  surface: '#171A1D',
  surface2:'#1D2226',
  surface3:'#20262B',
  textPrimary: '#F2F4F6',
  textSecondary:'#C1C7CD',
  textDisabled: '#C1C7CD66',
  border: '#2C333A',
  overlay: 'rgba(0,0,0,0.55)',

  primary:   { base: brand.primary400, onBase: '#052826', surface: '#0D3030', onSurface:'#B7E7E2', border: '#1B5B58' },
  secondary: { base: brand.secondary400, onBase: '#0B1619', surface: '#192428', onSurface:'#D0E0E6', border: '#28424A' },
  success:   { base: '#2CC07C', onBase: '#062A1B', surface: '#0E2F22', onSurface:'#C9F0E0', border: '#1B5E43' },
  warning:   { base: '#FFB456', onBase: '#2A1600', surface: '#2C2114', onSurface:'#FFE2BC', border: '#6E4C15' },
  danger:    { base: '#F06B6B', onBase: '#2A0A0A', surface: '#2B1A1A', onSurface:'#FFD3D3', border: '#6E2C2C' },
  info:      { base: '#6CA7FF', onBase: '#0A1A36', surface: '#142038', onSurface:'#D7E6FF', border: '#2E4D82' },
  neutral:   { base: '#7E8A93', onBase: '#0D0F10', surface:'#1D2226', onSurface:'#E6EAED', border: '#2C333A' },
};

export const stateOpacity = {
  pressed: 0.12,
  focus: 0.16,
  disabled: 0.38,
};
