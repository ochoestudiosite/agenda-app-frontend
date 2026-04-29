import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4 animate-fade-up">
      <p className="font-display text-8xl font-bold text-gold/20 leading-none select-none">404</p>
      <div className="-mt-4">
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight mb-2">Página no encontrada</h1>
        <p className="text-ink-3 text-sm">La ruta que buscas no existe.</p>
      </div>
      <Link to="/">
        <Button variant="outline">Ir al inicio</Button>
      </Link>
    </div>
  );
}
