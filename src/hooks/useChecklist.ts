import { useState, useCallback } from 'react';

export function useChecklist() {
  const [items, setItems] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setItems(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isChecked = useCallback((id: string) => !!items[id], [items]);

  return { items, toggle, isChecked };
}
