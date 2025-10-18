// src/api/client.ts
export type LoginBody = { username: string; password: string };
import { API_BASE } from '@/src/config';

export type LoginSuccess = {
  ok: true;
  token: string;
  user: { id: string; username: string; role: string; shop_id: string };
  shop: { id: string; name: string; slug: string };
  expires_in: string; // "7d"
};

export type LoginResponse = LoginSuccess | { ok: false; error?: string };

const BASE_URL = API_BASE;

export async function login(body: LoginBody): Promise<LoginSuccess> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data: LoginResponse;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid server response.');
  }

  if (!res.ok || !data.ok) {
    throw new Error((data as any)?.error || `Login failed (${res.status}).`);
  }

  return data as LoginSuccess;
}
