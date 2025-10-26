// lib/exchange.ts
import { Rate } from './types';
import { usdCeil2, sosInt } from './math';

export async function postExchangeForExtra(
  API_BASE: string,
  extraUsdAmt: number,
  dir: 'USD2SOS' | 'SOS2USD',
  r: Rate,
  headers: any,
  roundingMeta?: any,          // used only for USD→SOS
     saleId?: string,
  customerId?: string
) {
  // 1) Load CASH_ON_HAND accounts (names for from_method / to_method)

  let accounts: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/accounts?limit=200`, { headers });
    const j = await res.json();
    accounts = (j?.data ?? j ?? []).filter((a: any) => a?.AccountType?.name === 'CASH_ON_HAND');
  } catch { accounts = []; }

  const usdAcc = (accounts.find(a => /USD/i.test(a.name)) || accounts.find(a => a.name === 'Cash_USD'))?.name ?? null;
  const sosAcc = (accounts.find(a => /SOS/i.test(a.name)) || accounts.find(a => a.name === 'Cash_SOS'))?.name ?? null;

  // 2) Rates
  const accounting = r.accounting || 0;
  const sell = r.sell || 0; // USD→SOS
  const buy  = r.buy  || 0; // SOS→USD

  // 3) Build the minimal body your API expects
  const body: any = {
    from_currency: dir === 'USD2SOS' ? 'USD' : 'SOS',
    counter_rate:  dir === 'USD2SOS' ? sell : buy,
    accounting_rate: accounting,
    from_method: dir === 'USD2SOS' ? sosAcc : usdAcc, // pool we REDUCE
    to_method:   dir === 'USD2SOS' ? usdAcc : sosAcc, // pool we INCREASE
  };

  // amount is “what the customer pays” in FROM currency
  if (dir === 'USD2SOS') {
    // Customer gives USD; amount is extra USD
    body.amount = usdCeil2(extraUsdAmt);
    if (roundingMeta) body.rounding_meta = roundingMeta; // { chosen_target_native, ... }
  } else {
    // Customer gives SOS; convert extra USD into SOS using BUY for the input
    const sosIn = sosInt(extraUsdAmt * (buy || accounting));
    body.amount = sosIn;
    // No rounding meta for SOS→USD
  }

  // ...
  if (saleId) body.sale_id = saleId;
  if (customerId) body.customer_id = customerId;
  // ...

  // 4) POST
  const rres = await fetch(`${API_BASE}/api/exchange`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const j = await rres.json();
  if (!rres.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${rres.status}`);
  return j;
}