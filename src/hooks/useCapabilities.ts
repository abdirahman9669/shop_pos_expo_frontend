// src/hooks/useCapabilities.ts
import { useEffect, useMemo, useState } from 'react';
import { fetchMyCapabilities } from '@/src/api/capabilities';

export function useCapabilities() {
  const [keys, setKeys] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const set = await fetchMyCapabilities();
        if (alive) setKeys(set);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load capabilities');
      }
    })();
    return () => { alive = false; };
  }, []);

  const can = useMemo(() => {
    return (key: string) => !!keys?.has(key);
  }, [keys]);

  return { ready: !!keys || !!error, can, keys, error };
}
