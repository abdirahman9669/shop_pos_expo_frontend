// src/api/capabilities.ts
import { API_BASE } from '@/src/config';
import { loadAuth } from '@/src/auth/storage';

async function authHeaders() {
  const auth = await loadAuth();
  return {
    'Content-Type': 'application/json',
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
}

export async function fetchMyCapabilities(): Promise<Set<string>> {
  const r = await fetch(`${API_BASE}/api/capabilities/me`, { headers: await authHeaders() });
  const j = await r.json();
  if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
  return new Set<string>(j.keys || []);
}
