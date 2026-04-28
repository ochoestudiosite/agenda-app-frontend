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
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto" noValidate>
      <Input
        label="Código de confirmación"
        placeholder="ABC123"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        error={error}
        required
        className="tracking-[0.3em] text-center text-lg font-display"
        autoCapitalize="characters"
        helper="6 caracteres — letras y números"
        maxLength={6}
      />
      <Button type="submit" size="lg" className="w-full mt-4" loading={loading}>
        Buscar cita
      </Button>
    </form>
  );
}
