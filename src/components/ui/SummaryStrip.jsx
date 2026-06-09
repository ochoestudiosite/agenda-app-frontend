import { Fragment } from 'react';

function AvatarStack({ avatars }) {
  const show  = avatars.slice(0, 3);
  const extra = avatars.length - 3;
  const multi = avatars.length > 1;

  return (
    <div className="flex items-center shrink-0" style={{ paddingRight: multi ? '4px' : '0' }}>
      {show.map((a, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full border-2 border-card overflow-hidden bg-gold/10 flex items-center justify-center"
          style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: show.length - i, position: 'relative' }}
        >
          {a.src
            ? <img src={a.src} alt="" className="w-full h-full object-cover" />
            : <span className="text-[9px] font-bold text-gold leading-none select-none">{a.initials}</span>
          }
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-8 h-8 rounded-full border-2 border-card bg-raised flex items-center justify-center"
          style={{ marginLeft: '-8px', zIndex: 0, position: 'relative' }}
        >
          <span className="text-[9px] font-bold text-ink-3 leading-none">+{extra}</span>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function SummaryItem({ item }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 shrink-0">
      {item.avatars ? (
        <AvatarStack avatars={item.avatars} />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-gold">
          <CalendarIcon />
        </div>
      )}
      <div className="min-w-0 max-w-[160px]">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-gold/70 leading-none mb-1">
          {item.category}
        </p>
        <p className="text-[12.5px] font-semibold text-ink leading-snug truncate">
          {item.label}
        </p>
        {item.sub && (
          <p className="text-[10.5px] text-ink-3 leading-none mt-0.5 truncate">
            {item.sub}
          </p>
        )}
      </div>
    </div>
  );
}

// items: Array<{ id, category, avatars?, label, sub? }>
// Items without `avatars` render a calendar icon.
export default function SummaryStrip({ items, ariaLabel = 'Resumen de selección' }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-8 animate-fade-in" role="status" aria-label={ariaLabel}>
      <div className="bg-card border border-edge/60 dark:border-white/[0.08] rounded-2xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="flex items-stretch overflow-x-auto scrollbar-hide">
          {items.map((item, i) => (
            <Fragment key={item.id}>
              <SummaryItem item={item} />
              {i < items.length - 1 && (
                <div className="self-stretch flex items-center shrink-0 py-3" aria-hidden>
                  <div className="w-px h-full bg-edge/40" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
