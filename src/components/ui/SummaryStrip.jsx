import { Fragment } from 'react';
import { Calendar } from 'lucide-react';

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
            : <span className="text-[10px] font-bold text-gold leading-none select-none">{a.initials}</span>
          }
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-8 h-8 rounded-full border-2 border-card bg-raised flex items-center justify-center"
          style={{ marginLeft: '-8px', zIndex: 0, position: 'relative' }}
        >
          <span className="text-[10px] font-bold text-ink-3 leading-none">+{extra}</span>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return <Calendar className="w-3.5 h-3.5" />;
}

// Mobile stacks each item full-width so long branch/service/specialist names
// wrap and stay fully readable; sm+ keeps the original compact horizontal strip
// (constrained width + truncate) where the row has to fit several items.
function SummaryItem({ item }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 w-full sm:w-auto sm:shrink-0">
      {item.avatars ? (
        <AvatarStack avatars={item.avatars} />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-gold">
          <CalendarIcon />
        </div>
      )}
      <div className="min-w-0 flex-1 sm:flex-none sm:max-w-[160px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-gold/70 leading-none mb-1">
          {item.category}
        </p>
        <p className="text-[13px] font-semibold text-ink leading-snug break-words sm:truncate">
          {item.label}
        </p>
        {item.sub && (
          <p className="text-[11px] text-ink-3 leading-snug sm:leading-none mt-0.5 break-words sm:truncate">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:overflow-x-auto scrollbar-hide">
          {items.map((item, i) => (
            <Fragment key={item.id}>
              <SummaryItem item={item} />
              {i < items.length - 1 && (
                <div className="self-stretch flex items-center shrink-0 px-4 sm:px-0 sm:py-3" aria-hidden>
                  <div className="h-px w-full bg-edge/40 sm:w-px sm:h-full" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
