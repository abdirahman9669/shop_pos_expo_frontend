// src/auth/useRequireAuth.ts
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router'
import { InteractionManager } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@/src/auth/AuthContext';
import { loadAuth } from '@/src/auth/storage';

type JwtPayload = { exp?: number };

export function useRequireAuth(loginPath: string = '/auth/login') {
  const { token: ctxToken, signOut } = useAuth();
  const router = useRouter();
  const actedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let cancelInteraction: { cancel?: () => void } | null = null;

    const schedule = (fn: () => void) => {
      // Defer until after navigation & animations are settled
      cancelInteraction = InteractionManager.runAfterInteractions(fn);
    };

    const run = async () => {
      if (actedRef.current || cancelled) return;

      const persisted = await loadAuth().catch(() => null);
      const token = persisted?.token ?? ctxToken ?? null;

      if (!token) {
        actedRef.current = true;
        schedule(() => !cancelled && router.replace(loginPath as any));
        return;
      }

      try {
        const { exp } = jwtDecode<JwtPayload>(token) || {};
        const now = Date.now() / 1000;
        if (exp && exp < now) {
          actedRef.current = true;
          await Promise.resolve(signOut?.());
          schedule(() => !cancelled && router.replace(loginPath as any));
        }
      } catch {
        actedRef.current = true;
        await Promise.resolve(signOut?.());
        schedule(() => !cancelled && router.replace(loginPath as any));
      }
    };

    run();
    return () => {
      cancelled = true;
      cancelInteraction?.cancel?.();
    };
  }, [ctxToken, signOut, router, loginPath]);
}