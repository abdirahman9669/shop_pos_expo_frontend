export type Device = { id: string; label?: string; name?: string };
export type CashSession = { id: string; device_id: string; opened_at: string; closed_at: string | null };
export type Customer = { id: string; name: string; phone?: string | null };
export type Rate = { accounting: number; sell: number; buy: number };

export type Line = {
  product_id: string;
  name: string;
  qty: number;
  unit_price_usd: number;
  batch_id?: string | null;
  store_id?: string | null;
  expiry_date?: string | null;
  lot_summary?: string;
};




export type CartId = string;

export type CartSnapshot = {
  id: CartId;
  label: string;
  created_at: number;

  device: Device | null;
  session: CashSession | null;
  customer: Customer | null;

  lines: Line[];
  usdAmount: string;
  sosNative: string;
  rate: Rate;
  exchangeAccepted: boolean;

  scanFeedback?: { title: string; subtitle?: string; ok?: boolean } | null;
  beepTick?: number;
};
