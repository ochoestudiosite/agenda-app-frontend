import { useEffect, useRef, useState } from 'react';

// Fires once, true the moment the element scrolls into the viewport, then
// disconnects. Environments without IntersectionObserver (old browsers,
// jsdom in tests) fall back to "already in view" so content is never stuck
// hidden waiting for an API that doesn't exist.
export function useInView({ threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold, rootMargin });

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return [ref, inView];
}
