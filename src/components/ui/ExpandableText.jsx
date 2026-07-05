import { useLayoutEffect, useRef, useState } from 'react';

// Clamps text to N lines and only reveals a "Ver más / Ver menos" toggle when
// the text actually overflows the clamp — short text never shows the button.
// Re-measures on resize (orientation change, text zoom) while collapsed; skips
// it while expanded so removing the clamp to show full text never flips the
// button back off (the element briefly reports scrollHeight === clientHeight).
// Also re-measures once web fonts finish loading — the initial measurement can
// run against fallback-font metrics before the swap, under- or over-clamping.
export default function ExpandableText({ text, className = '', clampClassName = 'line-clamp-2' }) {
  const ref = useRef(null);
  const [isClamped, setIsClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    let cancelled = false;
    const measure = () => { if (!cancelled) setIsClamped(el.scrollHeight > el.clientHeight + 1); };
    measure();

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }

    if (typeof ResizeObserver === 'undefined') {
      return () => { cancelled = true; };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelled = true; ro.disconnect(); };
  }, [text, expanded]);

  function toggle(e) {
    e.stopPropagation();
    setExpanded(v => !v);
  }

  return (
    <>
      <p ref={ref} className={`${className} ${expanded ? '' : clampClassName}`}>{text}</p>
      {isClamped && (
        <button
          type="button"
          onClick={toggle}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
          className="mt-0.5 text-[11px] font-semibold text-gold hover:underline cursor-pointer rounded
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </>
  );
}
