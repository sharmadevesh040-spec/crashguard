import { useState, useEffect } from 'react';
import LanguageSelect from './pages/LanguageSelect';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Contacts from './pages/Contacts';
import History from './pages/History';
import Settings from './pages/Settings';
import Header from './components/Header';
import BottomNav from './components/BottomNav';

export default function App() {
  const [preferredLanguage, setPreferredLanguage] = useState(
    localStorage.getItem('preferredLanguage') || ''
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem('isLoggedIn') === 'true'
  );
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);

  // Sync state if settings have auto-start monitoring
  useEffect(() => {
    if (isLoggedIn) {
      const settings = localStorage.getItem('emergency_settings');
      if (settings) {
        try {
          const parsed = JSON.parse(settings);
          if (parsed.autoStart) {
            setIsMonitoring(true);
          }
        } catch (e) {
          console.error('Error loading autoStart setting:', e);
        }
      }
    }
  }, [isLoggedIn]);

  if (!preferredLanguage) {
    return <LanguageSelect onSelect={setPreferredLanguage} />;
  }

  if (!isLoggedIn) {
    return <Login onSuccess={() => setIsLoggedIn(true)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    setIsMonitoring(false);
    setGpsActive(false);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            isMonitoring={isMonitoring} 
            setIsMonitoring={setIsMonitoring} 
            onGpsStatusChange={setGpsActive}
          />
        );
      case 'map':
        return <MapView />;
      case 'contacts':
        return <Contacts />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings onLogout={handleLogout} />;
      default:
        return (
          <Dashboard 
            isMonitoring={isMonitoring} 
            setIsMonitoring={setIsMonitoring} 
            onGpsStatusChange={setGpsActive}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 flex flex-col no-scrollbar">
      <Header isMonitoring={isMonitoring} gpsActive={gpsActive} />
      
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {renderActiveTab()}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
