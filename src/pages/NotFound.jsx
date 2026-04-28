import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <p className="font-display text-7xl font-bold text-gold">404</p>
      <h1 className="text-2xl font-semibold text-ink">Página no encontrada</h1>
      <p className="text-ink-2">La ruta que buscas no existe.</p>
      <Link to="/"><Button variant="outline">Ir al inicio</Button></Link>
    </div>
  );
}
