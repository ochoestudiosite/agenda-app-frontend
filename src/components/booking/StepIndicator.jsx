const BASE_STEPS = [
  { n: 1, label: 'Servicio' },
  { n: 2, label: 'Barbero'  },
  { n: 3, label: 'Horario'  },
  { n: 4, label: 'Datos'    },
];

const BRANCH_STEPS = [
  { n: 0, label: 'Sucursal' },
  ...BASE_STEPS,
];

export default function StepIndicator({ currentStep, hasBranch = false }) {
  const STEPS    = hasBranch ? BRANCH_STEPS : BASE_STEPS;
  const stepIdx  = STEPS.findIndex(s => s.n === currentStep);
  const progress = STEPS.length > 1 ? (Math.max(0, stepIdx) / (STEPS.length - 1)) * 100 : 0;

  return (
    <div className="mb-10 animate-fade-in">
      {/* Progress bar */}
      <div className="relative h-0.5 bg-edge rounded-full mb-4 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gold rounded-full transition-all duration-500 ease-spring"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between">
        {STEPS.map((step, idx) => {
          const done    = stepIdx > STEPS.findIndex(s => s.n === step.n);
          const current = currentStep === step.n;
          return (
            <div key={step.n} className="flex flex-col items-center gap-1.5">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
                done    ? 'bg-gold'
                : current ? 'bg-gold/15 ring-2 ring-gold ring-offset-2 ring-offset-surface'
                          : 'bg-raised border border-edge',
              ].join(' ')}>
                {done ? (
                  <svg className="w-3 h-3 text-on-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`text-[0.6875rem] font-semibold ${current ? 'text-gold' : 'text-ink-3'}`}>
                    {idx + 1}
                  </span>
                )}
              </div>
              <span className={`text-[0.6875rem] font-medium hidden sm:block transition-colors ${current ? 'text-ink' : done ? 'text-ink-3' : 'text-ink-3/60'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
