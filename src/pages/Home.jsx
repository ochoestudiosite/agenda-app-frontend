import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20">
      {/* Hero */}
      <div className="text-center mb-20">
        <p className="text-gold text-sm font-medium uppercase tracking-widest mb-4">Barbería Premium</p>
        <h1 className="font-display text-5xl sm:text-6xl font-bold mb-6 leading-tight text-ink">
          La experiencia del<br />
          <span className="text-gold">barbero perfecto</span>
        </h1>
        <p className="text-ink-2 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Reserva tu cita con los mejores especialistas. Degradados, cortes clásicos, arreglo de barba y más.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/agendar">
            <Button size="lg" className="w-full sm:w-auto">
              Agendar cita
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </Link>
          <Link to="/gestionar">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">Gestionar mi cita</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
        {FEATURES.map(f => (
          <div key={f.title} className="card p-6 text-center group hover:border-gold/40 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4 text-gold group-hover:bg-gold/20 transition-colors">
              {f.icon}
            </div>
            <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
            <p className="text-ink-2 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {/* CTA strip */}
      <div className="card p-8 sm:p-12 text-center">
        <h2 className="font-display text-3xl font-semibold mb-3 text-ink">¿Listo para tu próxima cita?</h2>
        <p className="text-ink-2 mb-8 max-w-md mx-auto">Selecciona tu servicio, elige tu barbero y agenda en minutos.</p>
        <Link to="/agendar">
          <Button size="lg">Reservar ahora</Button>
        </Link>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Reserva instantánea',
    description: 'Agenda tu cita en menos de 2 minutos, sin llamadas ni esperas.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.338 2.698H4.306c-1.364 0-2.333-1.698-1.337-2.698L5 14.5" />
      </svg>
    ),
    title: 'Barberos expertos',
    description: 'Especialistas certificados con años de experiencia y técnica depurada.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Gestión sencilla',
    description: 'Reagenda o cancela cuando quieras usando tu código de confirmación.',
  },
];
