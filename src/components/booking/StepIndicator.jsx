const STEPS = [
  { n: 1, label: 'Servicio' },
  { n: 2, label: 'Barbero' },
  { n: 3, label: 'Fecha y Hora' },
  { n: 4, label: 'Tus Datos' },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200
                ${currentStep > step.n
                  ? 'bg-gold text-on-gold'
                  : currentStep === step.n
                  ? 'bg-gold/15 border-2 border-gold text-gold'
                  : 'bg-raised border border-edge text-ink-3'
                }`}
            >
              {currentStep > step.n ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : step.n}
            </div>
            <span className={`text-xs hidden sm:block transition-colors ${currentStep === step.n ? 'text-gold font-medium' : 'text-ink-3'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-12 sm:w-20 h-px mx-1 mb-5 transition-colors duration-300 ${currentStep > step.n ? 'bg-gold' : 'bg-edge'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
