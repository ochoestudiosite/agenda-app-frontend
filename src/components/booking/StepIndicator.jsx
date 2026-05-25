import { Fragment } from 'react';

const BASE_STEPS = [
  { n: 1, label: 'Servicio' },
  { n: 2, label: 'Especialista' },
  { n: 3, label: 'Horario' },
  { n: 4, label: 'Datos' },
];

const BRANCH_STEPS = [
  { n: 0, label: 'Sucursal' },
  ...BASE_STEPS,
];

export default function StepIndicator({ currentStep, hasBranch = false, onNavigate }) {
  const STEPS   = hasBranch ? BRANCH_STEPS : BASE_STEPS;
  const stepIdx = STEPS.findIndex(s => s.n === currentStep);

  return (
    <div className="mb-10 select-none animate-fade-in">
      {/* Circles + connectors */}
      <div className="flex items-center">
        {STEPS.map((step, idx) => {
          const isCompleted = stepIdx > idx;
          const isCurrent   = currentStep === step.n;
          const isClickable = isCompleted && !!onNavigate;
          // Connector before this step is gold when the previous step is done
          const connectorFilled = stepIdx >= idx;

          return (
            <Fragment key={step.n}>
              {idx > 0 && (
                <div className="flex-1 h-px mx-2 relative rounded-full overflow-hidden bg-edge/40">
                  <div
                    className="absolute inset-y-0 left-0 bg-gold/55 rounded-full transition-all duration-500 ease-out"
                    style={{ width: connectorFilled ? '100%' : '0%' }}
                  />
                </div>
              )}

              <div className="flex flex-col items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={isClickable ? () => onNavigate(step.n) : undefined}
                  disabled={!isClickable}
                  title={isClickable ? `Volver a ${step.label}` : undefined}
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                    isCompleted
                      ? 'bg-gold cursor-pointer hover:scale-110 hover:shadow-[0_0_0_5px_rgba(184,134,11,0.18)] active:scale-[0.97]'
                      : isCurrent
                        ? 'bg-surface border-2 border-gold shadow-[0_0_0_4px_rgba(184,134,11,0.1)] cursor-default'
                        : 'bg-surface border-2 border-edge/50 cursor-default',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={`text-[11px] font-bold tabular-nums leading-none ${isCurrent ? 'text-gold' : 'text-ink-3/40'}`}>
                      {idx + 1}
                    </span>
                  )}
                </button>

                <span className={[
                  'hidden sm:block text-[10.5px] font-medium whitespace-nowrap transition-colors duration-200',
                  isCurrent   ? 'text-ink font-semibold'
                  : isCompleted ? 'text-ink-3'
                                : 'text-ink-3/40',
                ].join(' ')}>
                  {step.label}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Current step label — mobile only */}
      <div className="mt-3 flex items-center justify-between sm:hidden">
        <span className="text-[11px] font-semibold text-gold uppercase tracking-widest">
          {STEPS.find(s => s.n === currentStep)?.label ?? ''}
        </span>
        <span className="text-[11px] text-ink-3 tabular-nums">
          {stepIdx + 1} de {STEPS.length}
        </span>
      </div>
    </div>
  );
}
