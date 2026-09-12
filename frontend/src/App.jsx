import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Dispatch from './pages/Dispatch';
import Forecast from './pages/Forecast';
import Scenarios from './pages/Scenarios';
import History from './pages/History';

const pageConfig = {
  '/': { title: 'Dashboard', subtitle: 'Village Microgrid Overview' },
  '/dispatch': { title: 'Live Dispatch', subtitle: 'Real-time optimization controls' },
  '/forecast': { title: 'Energy Forecast', subtitle: 'Solar, wind & demand predictions' },
  '/scenarios': { title: 'What-If Simulator', subtitle: 'Explore scenario impacts' },
  '/history': { title: 'History', subtitle: 'Historical performance review' },
};

function AppLayout() {
  const location = useLocation();
  const config = pageConfig[location.pathname] || pageConfig['/'];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header title={config.title} subtitle={config.subtitle} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/scenarios" element={<Scenarios />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
