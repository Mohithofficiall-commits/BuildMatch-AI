import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface CompareState {
  engineerIds: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const CompareContext = createContext<CompareState | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [engineerIds, setEngineerIds] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setEngineerIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  const remove = useCallback((id: string) => setEngineerIds((prev) => prev.filter((x) => x !== id)), []);
  const clear = useCallback(() => setEngineerIds([]), []);
  const has = useCallback((id: string) => engineerIds.includes(id), [engineerIds]);

  return <CompareContext.Provider value={{ engineerIds, toggle, remove, clear, has }}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareState {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
}
