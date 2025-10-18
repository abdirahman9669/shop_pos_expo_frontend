// src/ux/PageActionsProvider.tsx
import React, {createContext, useContext, useMemo, useRef} from 'react';

type Ctx = {
  registerPrimary: (id: string) => void;
  unregisterPrimary: (id: string) => void;
  count: () => number;
};

const Ctx = createContext<Ctx | null>(null);

export function PageActionsProvider({ children }: { children: React.ReactNode }) {
  const setRef = useRef(new Set<string>());

  const api = useMemo<Ctx>(() => ({
    registerPrimary: (id) => {
      setRef.current.add(id);
      if (setRef.current.size > 1) {
        // Dev-only guardrail
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn(
            `[UX] More than one primary action on this screen: ${Array.from(setRef.current).join(', ')}`
          );
        }
      }
    },
    unregisterPrimary: (id) => setRef.current.delete(id),
    count: () => setRef.current.size,
  }), []);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePageActions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePageActions() must be used within <PageActionsProvider>');
  return ctx;
}
