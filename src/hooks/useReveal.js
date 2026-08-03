import { useInView } from './useInView';

// Restores the intent behind the landing's existing animate-fade-up entrance
// for anything below the fold. Home.jsx mounts every section at once (no
// lazy mount), so a plain `animate-fade-up` class fires on mount — by the
// time a visitor actually scrolls down, the animation already finished and
// the section has looked static the whole time. This hook keeps the exact
// same keyframe/timing/stagger, it just waits for the element to actually
// enter the viewport before applying the class.
// prefers-reduced-motion is handled globally in index.css (near-zero
// animation duration), not here — no need to branch on it in JS.
export function useReveal({ delay = 0, animation = 'animate-fade-up' } = {}) {
  const [ref, inView] = useInView();
  return {
    ref,
    className: inView ? animation : 'opacity-0',
    style: inView ? { animationDelay: `${delay}ms`, animationFillMode: 'both' } : undefined,
  };
}
