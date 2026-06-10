import { useState, useEffect } from 'react';

export const COUNTRIES = [
  { code: '+52', name: 'México' },
  { code: '+1',  name: 'USA/Canadá' },
  { code: '+57', name: 'Colombia' },
  { code: '+54', name: 'Argentina' },
  { code: '+34', name: 'España' },
  { code: '+56', name: 'Chile' },
  { code: '+51', name: 'Perú' },
];

export default function PhoneInput({ label, error, helper, value = '', onChange, required, className = '', ...props }) {
  const [code, setCode] = useState('+52');
  const [number, setNumber] = useState('');

  useEffect(() => {
    if (!value) {
      setNumber('');
      return;
    }
    const match = COUNTRIES.find(c => value.startsWith(c.code));
    if (match) {
      setCode(match.code);
      setNumber(value.slice(match.code.length));
    } else {
      setNumber(value);
    }
  }, [value]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    onChange({ target: { value: newCode + number } });
  };

  const handleNumberChange = (e) => {
    const newNum = e.target.value.replace(/\D/g, '').slice(0, 10);
    setNumber(newNum);
    onChange({ target: { value: code + newNum } });
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-ink leading-none">
          {label}
          {required && <span className="text-gold/70 ml-1 text-xs" aria-hidden="true">*</span>}
        </label>
      )}
      <div className={[
        'flex items-center w-full bg-card border rounded-xl overflow-hidden',
        'transition-all duration-160 ease-spring',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-gold/30 focus-within:border-gold',
        error
          ? 'border-red-500 focus-within:ring-red-500/20 focus-within:border-red-500'
          : 'border-edge hover:border-edge-strong',
        className,
      ].join(' ')}>
        <div className="relative border-r border-edge shrink-0 bg-page/50">
          <select 
            value={code} 
            onChange={handleCodeChange}
            className="h-[50px] bg-transparent text-[0.9375rem] pl-4 pr-7 appearance-none cursor-pointer focus:outline-none text-ink"
            style={{ width: '110px' }}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code} className="bg-card text-ink">
                {c.code} {c.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <input
          type="tel"
          value={number}
          onChange={handleNumberChange}
          className="flex-1 h-[50px] bg-transparent px-4 text-[0.9375rem] text-ink placeholder:text-ink-3 focus:outline-none w-full"
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1" role="alert">
        <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        {error}
      </p>}
      {helper && !error && <p className="text-xs text-ink-3">{helper}</p>}
    </div>
  );
}
