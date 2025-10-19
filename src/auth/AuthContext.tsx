// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginApi } from '@/src/api/client';
import { saveAuth, loadAuth, clearAuth } from './storage';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { API_BASE } from '@/src/config';

type User = { id: string; username: string; role: string; shop_id: string };
type Shop = { id: string; name: string; slug: string };

type AuthState = {
  token: string | null;
  user: User | null;
  shop: Shop | null;
  loading: boolean;    // bootstrapping or signing in
};
/*
type AuthCtx = AuthState & {
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
*/

type AuthCtx = AuthState & {
  signIn: (form: { username: string; password: string; shop_code?: string | null; phone_number?: string | null }) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    shop: null,
    loading: true,
  });

  // restore from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const { token, meta } = await loadAuth();
        setState(s => ({
          ...s,
          token: token ?? null,
          user: meta?.user ?? null,
          shop: meta?.shop ?? null,
          loading: false,
        }));
      } catch {
        setState(s => ({ ...s, loading: false }));
      }
    })();
  }, []);

            const signIn: AuthCtx['signIn'] = async (form) => {
            setState(s => ({ ...s, loading: true }));
            try {
                const res = await loginApi(form);

                await saveAuth(res.token, { user: res.user, shop: res.shop, expires_in: res.expires_in });
                setState({ token: res.token, user: res.user, shop: res.shop, loading: false });

                // 👇 Redirect to home (or main dashboard)
                router.replace('/');
            } catch (e) {
                setState(s => ({ ...s, loading: false }));
                throw e;
            }
            };


            const signOut = useCallback(async () => {
            // get token (prefer in-memory, fall back to persisted)
            const token = state.token ?? (await loadAuth())?.token ?? null;
                console.log('Signing out, token=', token);
            try {
                if (token) {
                // NOTE: if your router is mounted at /api/auth, keep the /api prefix
                await fetch(`${API_BASE}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    },
                });
                }
            } catch {
                // ignore network errors; we still clear locally
            } finally {
                await clearAuth();
                setState({ token: null, user: null, shop: null, loading: false });
                console.log('hhhhhhhhh');
                router.replace('/auth/login');
            }
            }, [state.token]);


  const value = useMemo<AuthCtx>(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
