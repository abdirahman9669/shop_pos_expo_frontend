export const currency = (n?: number, symbol = '$') =>
  typeof n === 'number' ? `${symbol}${n.toFixed(2)}` : '—';

export const number = (n?: number) =>
  typeof n === 'number' ? n.toLocaleString() : '—';
