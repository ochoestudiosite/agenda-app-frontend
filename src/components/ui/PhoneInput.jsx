import { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export const COUNTRIES = [
  { code: '+52', name: 'México' },
  { code: '+1',  name: 'USA/Canadá' },
  { code: '+57', name: 'Colombia' },
  { code: '+54', name: 'Argentina' },
  { code: '+34', name: 'España' },
  { code: '+56', name: 'Chile' },
  { code: '+51', name: 'Perú' },
];

export default function PhoneInput({ label, error, helper, value = '', onChange, onBlur, required, disabled, className = '', id, placeholder = '55 1234 5678', ...props }) {
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

  const handleContainerBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      onBlur?.({ target: { value: code + number } });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink leading-none">
          {label}
          {required && <span className="text-gold/70 ml-1 text-xs" aria-hidden="true">*</span>}
        </label>
      )}
      <div
        onBlur={handleContainerBlur}
        className={[
          'flex items-center w-full bg-card border rounded-xl overflow-hidden',
          'transition-all duration-160 ease-spring',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-gold/30 focus-within:border-gold',
          error
            ? 'border-red-500 focus-within:ring-red-500/20 focus-within:border-red-500'
            : 'border-edge hover:border-edge-strong',
          disabled ? 'opacity-50 pointer-events-none' : '',
          className,
        ].join(' ')}
      >
        <div className="relative border-r border-edge shrink-0 bg-page/50">
          <select
            value={code}
            onChange={handleCodeChange}
            disabled={disabled}
            className="w-[7rem] h-[50px] bg-transparent text-[16px] pl-4 pr-7 appearance-none cursor-pointer focus:outline-none text-ink"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code} className="bg-card text-ink">
                {c.code} {c.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
        <input
          id={id}
          type="tel"
          value={number}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 h-[50px] bg-transparent px-4 text-[16px] text-ink placeholder:text-ink-3 focus:outline-none w-full"
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1" role="alert">
        <AlertCircle className="w-3 h-3 shrink-0" />
        {error}
      </p>}
      {helper && !error && <p className="text-xs text-ink-3">{helper}</p>}
    </div>
  );
}
