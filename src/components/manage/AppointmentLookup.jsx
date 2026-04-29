import { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function AppointmentLookup({ onSearch, loading }) {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) { setError('El código debe tener exactamente 6 caracteres.'); return; }
    setError('');
    onSearch(clean);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xs mx-auto" noValidate>
      <div className="card p-6 mb-4">
        <p className="label-section mb-4 text-center">Código de confirmación</p>
        <Input
          placeholder="ABC123"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          error={error}
          required
          className="tracking-[0.35em] text-center text-xl font-display font-bold text-gold"
          autoCapitalize="characters"
          maxLength={6}
          autoFocus
        />
        <p className="text-ink-3 text-xs text-center mt-2">6 caracteres — letras y números</p>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Buscar cita
      </Button>
    </form>
  );
}
