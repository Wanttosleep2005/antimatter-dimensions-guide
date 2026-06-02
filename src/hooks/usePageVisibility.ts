import { useState, useEffect } from 'react';

/** Returns true when the page is hidden (background tab / minimized).
 *  Canvas components should skip rendering when hidden to free CPU. */
export function usePageVisibility() {
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return hidden;
}
