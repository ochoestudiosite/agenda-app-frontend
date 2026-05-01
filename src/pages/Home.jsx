import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useConfig } from '../hooks/useConfig';

export default function Home() {
  const { data: config } = useConfig();
  const bizName = config?.business_name ?? 'BarberPro';
  const bizLocation = config?.business_address
    ? config.business_address.split(',').slice(-1)[0]?.trim()
    : 'Ciudad de México';

  return (
    <div className="max-w-3xl mx-auto px-5">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 animate-fade-up">
        <p className="label-section mb-5">Barbería Premium · {bizLocation}</p>
        <h1 className="font-display text-[2.75rem] sm:text-6xl font-bold leading-[1.06] tracking-tightest text-ink mb-6">
          La experiencia<br />
          del <em className="not-italic text-gold">barbero perfecto.</em>
        </h1>
        <p className="text-ink-2 text-lg leading-relaxed max-w-md mb-10">
          Reserva en 2 minutos. Especialistas certificados, degradados, cortes clásicos y arreglo de barba.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/agendar">
            <Button size="lg" className="w-full sm:w-auto">
              Agendar cita
              <ArrowRight />
            </Button>
          </Link>
          <Link to="/gestionar">
            <Button size="lg" variant="subtle" className="w-full sm:w-auto">
              Gestionar mi cita
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl border border-edge hover:border-gold/30 bg-card hover:bg-raised/40 transition-all duration-240 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
            >
              <div className="w-10 h-10 rounded-xl bg-gold/8 flex items-center justify-center mb-4 text-gold group-hover:bg-gold/15 transition-colors duration-240">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-ink mb-1.5">{f.title}</h3>
              <p className="text-sm text-ink-3 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ─────────────────────────────────────────────────────────── */}
      <section className="mb-20 animate-fade-up" style={{ animationDelay: '180ms', animationFillMode: 'both' }}>
        <div className="relative overflow-hidden rounded-3xl bg-ink dark:bg-card border border-edge p-8 sm:p-12 text-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-gold/8 blur-3xl" />
          </div>
          <div className="relative">
            <p className="label-section text-stone-500 dark:text-ink-3 mb-3">Próxima cita</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-50 dark:text-ink mb-3 tracking-tightest">
              ¿Listo para tu look?
            </h2>
            <p className="text-stone-400 dark:text-ink-2 mb-8 max-w-sm mx-auto text-[0.9375rem] leading-relaxed">
              Selecciona tu servicio, elige tu especialista y agenda en minutos.
            </p>
            <Link to="/agendar">
              <button className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gold text-stone-900 dark:text-on-gold font-medium rounded-xl px-6 py-3.5 min-h-[52px] text-[0.9375rem] hover:bg-stone-100 dark:hover:bg-gold-light transition-all duration-160 active:scale-[0.97]">
                Reservar ahora
                <ArrowRight />
              </button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

function ArrowRight() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    title: 'Reserva instantánea',
    description: 'Agenda tu cita en menos de 2 minutos, sin llamadas ni esperas.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.338 2.698H4.306c-1.364 0-2.333-1.698-1.337-2.698L5 14.5" /></svg>,
    title: 'Barberos expertos',
    description: 'Especialistas certificados con años de experiencia y técnica depurada.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    title: 'Gestión sencilla',
    description: 'Reagenda o cancela cuando quieras con tu código de confirmación.',
  },
];
