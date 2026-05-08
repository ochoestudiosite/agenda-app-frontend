import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = "" }) {
  const { isDark, toggle } = useTheme();
  
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`w-10 h-10 flex items-center justify-center rounded-xl text-ink-3
                 hover:text-ink hover:bg-ink/5 transition-all duration-240 cursor-pointer ${className}`}
    >
      {isDark ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
    </button>
  );
}
