const SIZE_MAP = {
  selector:         'w-14 h-14',
  'selector-sm':    'w-14 h-14 sm:w-16 sm:h-16',
  summary:          'w-9 h-9',
  'summary-mini':   'w-5 h-5',
  confirm:          'w-10 h-10',
};

const TEXT_MAP = {
  selector:       'text-sm',
  'selector-sm':  'text-xl',
  summary:        'text-[12px]',
  'summary-mini': 'text-[10px]',
  confirm:        'text-sm',
};

function getInitials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

export default function EntityAvatar({
  size = 'summary',
  name,
  imageUrl,
  selected = false,
  lazyLoad = false,
  className = '',
  children,
}) {
  const sizeClass = SIZE_MAP[size] ?? SIZE_MAP.summary;
  const textClass = TEXT_MAP[size] ?? TEXT_MAP.summary;

  const borderClass = selected
    ? 'border-gold/60 bg-gold/10'
    : 'border-gold/20 bg-gold/8';

  return (
    <div
      className={`relative shrink-0 ${sizeClass} rounded-full border-2 ${borderClass}
                  flex items-center justify-center overflow-hidden transition-all duration-240
                  ${className}`}
    >
      {children ?? (
        <span className={`${textClass} font-bold text-gold`}>{getInitials(name)}</span>
      )}
      {imageUrl && (
        lazyLoad ? (
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0, transition: 'opacity 200ms ease' }}
            onLoad={e  => { e.currentTarget.style.opacity = '1'; }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )
      )}
    </div>
  );
}
