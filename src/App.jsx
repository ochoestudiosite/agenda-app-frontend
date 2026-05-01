import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './context/ThemeContext';
import { useConfig } from './hooks/useConfig';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Manage from './pages/Manage';
import NotFound from './pages/NotFound';

// Applies the business primary_color to CSS custom properties at runtime.
// The CSS uses RGB channels (e.g. "146 104 10") so Tailwind opacity modifiers work.
function ConfigApplier() {
  const { data: config } = useConfig();
  const { isDark }       = useTheme();

  useEffect(() => {
    const hex = config?.primary_color;
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    if (isDark) {
      // Brighten for dark backgrounds — keeps the brand feel on OLED
      r = Math.min(255, r + 68);
      g = Math.min(255, g + 68);
      b = Math.min(255, b + 68);
    }

    const rl = Math.min(255, r + 20);
    const gl = Math.min(255, g + 20);
    const bl = Math.min(255, b + 20);

    const root = document.documentElement;
    root.style.setProperty('--gold',       `${r} ${g} ${b}`);
    root.style.setProperty('--gold-light', `${rl} ${gl} ${bl}`);
  }, [config?.primary_color, isDark]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <ConfigApplier />
      <Layout>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/agendar"   element={<Booking />} />
          <Route path="/gestionar" element={<Manage />} />
          <Route path="*"          element={<NotFound />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}
