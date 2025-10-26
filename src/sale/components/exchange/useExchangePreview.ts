import { Rate } from '../../lib/types';
import { usdCeil2, sosInt, money } from '../../lib/math';

export function buildExchangePreviewText(
  params: {
    extraUsd: number;
    hasUSD: boolean;
    hasSOS: boolean;
    rate: Rate;
    totalUsd: number;
    paidUsdEq: number;
  }
) {
  const { extraUsd, hasUSD, hasSOS, rate, totalUsd, paidUsdEq } = params;
  const sell = rate.sell || 27000;
  const buy  = rate.buy  || 28000;

  const dir = hasUSD ? 'USD → SOS' : 'SOS → USD';
  const rateUsed = hasUSD ? sell : buy;

  let line1 = '';
  if (hasUSD) {
    const sosBack = sosInt(extraUsd * sell);
    line1 = `Customer paid $${money(extraUsd)} extra, and will receive ${sosBack.toLocaleString()} SOS back.`;
  } else {
    const sosExtra = sosInt(extraUsd * buy);
    const usdBack  = usdCeil2(sosExtra / buy);
    line1 = `Customer paid ${sosExtra.toLocaleString()} SOS extra, and will receive $${money(usdBack)} USD back.`;
  }

  return {
    dir, rateUsed, line1,
    header: `Extra detected: $${money(extraUsd)}`,
    totals: `Sale total: $${money(totalUsd)}   •   Paid: $${money(paidUsdEq)}   •   Extra: $${money(extraUsd)}`
  };
}
