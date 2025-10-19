// src/api/client.ts
import { API_BASE } from '@/src/config';

type LoginPayload = {
  username: string;
  password: string;
  shop_code?: string | null;
  phone_number?: string | null;
};

type LoginResponse = {
  ok: true;
  token: string;
  user: { id: string; username: string; role: string; shop_id: string };
  shop: { id: string; name: string; slug: string; code?: string; phone_number?: string } | null;
  expires_in: string;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  // client-side guard: require at least one of shop_code/phone_number
  if (!payload.shop_code && !payload.phone_number) {
    throw new Error('Provide either shop code or phone number.');
  }

  const r = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const j = await r.json();
  if (!r.ok || !j?.ok) {
    throw new Error(j?.error || `Login failed (HTTP ${r.status})`);
  }
  return j as LoginResponse;
}
