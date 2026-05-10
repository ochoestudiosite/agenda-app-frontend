import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import BrandTokensApplier from './components/BrandTokensApplier';
import Layout from './components/layout/Layout';
import Home from './pages/Home';

// Lazy: Booking and Manage are secondary flows. Keeping them out of the
// initial payload makes the landing page load near-instant on mobile.
const Booking  = lazy(() => import('./pages/Booking'));
const Manage   = lazy(() => import('./pages/Manage'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <ThemeProvider>
      {/* Applies brand tokens (colour, surface, ink, fonts, radius, button shape)
          for the lifetime of the SPA so /agendar and /gestionar look identical
          to the landing — no flash, no theme reset on navigation. */}
      <BrandTokensApplier />
      <Layout>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/agendar"   element={<Booking />} />
            <Route path="/gestionar" element={<Manage />} />
            <Route path="*"          element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </ThemeProvider>
  );
}
