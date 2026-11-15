import './Header.css';
import AppLogo from './AppLogo';

export default function Header({ isMonitoring, gpsActive }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <AppLogo size={32} />
          <h1 className="header-title">CrashGuard</h1>
        </div>

        <div className="header-status">
          <div className={`status-indicator ${isMonitoring ? 'active' : ''}`}>
             <div className="status-dot" />
             <span className="status-label">{isMonitoring ? 'Secured' : 'Offline'}</span>
          </div>
          {gpsActive && (
            <div className="gps-badge" title="GPS Locked">
              <span className="gps-icon">🛰️</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
