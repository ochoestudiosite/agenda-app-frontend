import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Manage from './pages/Manage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
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
