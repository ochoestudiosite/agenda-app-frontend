import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Calendar } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

export default function LandingNavbar({ businessName }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Servicios', href: '#servicios' },
    { name: 'Equipo', href: '#equipo' },
    { name: 'Testimoniales', href: '#testimoniales' },
    { name: 'Ubicación', href: '#ubicacion' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-3' : 'py-6'
      }`}
    >
      <div className="section-container">
        <div className={`relative flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-300 ${
          isScrolled ? 'glass shadow-lg shadow-black/5' : 'bg-transparent'
        }`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center text-surface transition-transform group-hover:scale-105 active:scale-95">
              <Calendar size={20} strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-ink">
              {businessName || 'Cita24'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
              >
                {link.name}
              </a>
            ))}
            <Link to="/agendar">
              <button className="bg-ink text-surface px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all">
                Agendar ahora
              </button>
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="md:hidden" />
            <button 
              className="md:hidden p-2 text-ink"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 p-6 md:hidden"
          >
            <div className="glass rounded-3xl p-8 flex flex-col gap-6 shadow-2xl">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-semibold text-ink"
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px bg-edge/50 my-2" />
              <Link to="/agendar" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full bg-ink text-surface py-4 rounded-2xl font-bold">
                  Agendar ahora
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
