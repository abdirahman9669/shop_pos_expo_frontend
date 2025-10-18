// math helpers used everywhere
export const n = (v: any, d = 0) => {
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : d;
};

// USD rounded **up** to 2 decimals; never lose a cent
export const usdCeil2 = (v: any) => {
  const x = n(v, 0);
  const s = x >= 0 ? 1 : -1;
  return s * (Math.ceil(Math.abs(x) * 100) / 100);
};

export const sosInt = (v: any) => Math.round(n(v, 0));
export const money = (v: any) => usdCeil2(v).toFixed(2);

/** Round SOS to nearest, up, or down 1000 */
export const roundSOS1000 = (
  value: number,
  mode: 'nearest' | 'up' | 'down' = 'nearest'
): number => {
  const step = 1000;
  if (mode === 'up') return Math.ceil(value / step) * step;
  if (mode === 'down') return Math.floor(value / step) * step;
  return Math.round(value / step) * step;
};

/** Compute rounding difference */
export const calcRoundingDiff = (original: number, rounded: number): number => {
  return Math.round(rounded - original);
};