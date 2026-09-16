import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteEffects() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.scrollTo({ top: 0, behavior: 'instant' });
    // SPA navigation should give keyboard/screen-reader users a useful starting point.
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}
