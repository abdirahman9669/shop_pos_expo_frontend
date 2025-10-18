import { useMemo, useState, useEffect } from 'react';
import { Line, Rate } from '../lib/types';
import { usdCeil2, sosInt } from '../lib/math';

export function useSalePayments(lines: Line[], rate: Rate) {
  const [usdAmount, setUsdAmount] = useState('');
  const [sosNative, setSosNative] = useState('');

  const totalUsd = useMemo(
    () => usdCeil2(lines.reduce((s, l) => s + (l.qty * l.unit_price_usd), 0)),
    [lines]
  );
  const totalSos = useMemo(
    () => sosInt(totalUsd * (rate.sell || 27000)),
    [totalUsd, rate.sell]
  );

  const paidUsdOnly = usdCeil2(usdAmount || 0);
  const paidSosOnly = sosInt(sosNative || 0);

  const paidSosUsdEq = usdCeil2((paidSosOnly || 0) / (rate.sell || 27000));
  const paidUsdEq = usdCeil2(paidUsdOnly + paidSosUsdEq);

  const remainingUsd = useMemo(
    () => usdCeil2(Math.max(0, totalUsd - paidUsdEq)),
    [totalUsd, paidUsdEq]
  );
  const remainingSos = useMemo(
    () => sosInt(remainingUsd * (rate.sell || 27000)),
    [remainingUsd, rate.sell]
  );

  const extraUsd = useMemo(
    () => usdCeil2(Math.max(0, paidUsdEq - totalUsd)),
    [paidUsdEq, totalUsd]
  );

  const hasUSD = paidUsdOnly > 0;
  const hasSOS = paidSosOnly > 0;
  const singleTenderOverpay = extraUsd > 0 && (hasUSD !== hasSOS);
  const dualTenderOverpay    = extraUsd > 0 && hasUSD && hasSOS;

  // Consumers can reset acceptance when these change; we just expose values.

  return {
    usdAmount, setUsdAmount,
    sosNative, setSosNative,
    totalUsd, totalSos,
    paidUsdOnly, paidSosOnly,
    paidUsdEq, paidSosUsdEq,
    remainingUsd, remainingSos,
    extraUsd, hasUSD, hasSOS, singleTenderOverpay, dualTenderOverpay,
  };
}
