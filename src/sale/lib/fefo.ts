import { Lot } from '../lib/api';

export const pickFEFOLot = (lots: Lot[]): Lot | null => {
  if (!lots || lots.length === 0) return null;
  const withStock = lots.find(l => l.on_hand > 0);
  return withStock || lots[0];
};
