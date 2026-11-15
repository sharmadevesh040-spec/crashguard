import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadSettings, saveSettings, getDefaultSettings, checkSmsPermission, requestSmsPermission, checkCallPermission, requestCallPermission } from '../services/emergency';
import './Settings.css';

export default function Settings({ onLogout }) {
  const [settings, setSettings] = useState(loadSettings());
  const [saved, setSaved] = useState(false);
  const [smsPermission, setSmsPermission] = useState({ granted: false, native: false });
  const [callPermission, setCallPermission] = useState({ granted: false, native: false });

  useEffect(() => {
    checkSmsPermission().then(setSmsPermission);
    checkCallPermission().then(setCallPermission);
  }, []);

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    showSaved();
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = () => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    saveSettings(defaults);
    showSaved();
  };

  return (
    <motion.div 
      className="settings-page page-container no-scrollbar"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="settings-header">
        <h2 className="page-title">Configuration</h2>
        <p className="page-subtitle">Personalize your safety protocol</p>
      </div>

      {saved && <div className="settings-saved-toast">✅ Profile Updated</div>}

      <div className="glass-card settings-section">
        <h3 className="section-label">Impact Sensitivity</h3>
        
        <div className="setting-control">
          <div className="setting-meta">
            <span className="label">Threshold</span>
            <span className="value">{settings.threshold} G-Unit</span>
          </div>
          <input
            type="range" min="15" max="50" step="1"
            value={settings.threshold}
            onChange={(e) => updateSetting('threshold', Number(e.target.value))}
            className="premium-slider"
          />
          <p className="hint">Lower values increase sensitivity. Recommend 30 for urban driving.</p>
        </div>

        <div className="setting-control">
          <div className="setting-meta">
            <span className="label">Abort Window</span>
            <span className="value">{settings.countdownDuration}s</span>
          </div>
          <input
            type="range" min="5" max="30" step="1"
            value={settings.countdownDuration}
            onChange={(e) => updateSetting('countdownDuration', Number(e.target.value))}
            className="premium-slider"
          />
          <p className="hint">Countdown duration before emergency SOS is broadcast.</p>
        </div>
      </div>

      <div className="glass-card settings-section">
        <h3 className="section-label">Emergency Broadcast</h3>
        <div className="setting-input-group">
          <label className="neon-input-label">Custom SOS Message</label>
          <textarea
            className="neon-input settings-textarea"
            rows="3"
            value={settings.emergencyMessage}
            onChange={(e) => updateSetting('emergencyMessage', e.target.value)}
          />
        </div>
        
        <div className="setting-input-group" style={{ marginTop: '1rem' }}>
          <label className="neon-input-label">Emergency Line (Auto-Call)</label>
          <input
            type="tel"
            className="neon-input"
            value={settings.emergencyNumber || '112'}
            onChange={(e) => updateSetting('emergencyNumber', e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card settings-section">
        <h3 className="section-label">System Permissions</h3>
        <div className="permission-row">
          <span>SMS Relay</span>
          <span className={`status ${smsPermission.granted ? 'ok' : 'warn'}`}>
            {smsPermission.granted ? 'ENABLED' : 'RESTRICTED'}
          </span>
        </div>
        <div className="permission-row">
          <span>Auto-dialer</span>
          <span className={`status ${callPermission.granted ? 'ok' : 'warn'}`}>
            {callPermission.granted ? 'ENABLED' : 'RESTRICTED'}
          </span>
        </div>
        <p className="hint">Grant permissions in Android settings for seamless background operation.</p>
      </div>

      <div className="settings-actions">
        <button className="btn btn-secondary btn-full ripple" onClick={handleReset}>
          🔄 Restore Defaults
        </button>
        {onLogout && (
          <button className="btn btn-danger btn-full ripple" onClick={onLogout} style={{ marginTop: '0.75rem' }}>
            🚪 Terminate Session
          </button>
        )}
      </div>

      <style>{`
        .settings-page {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-bottom: 6rem;
        }
        .settings-header {
           margin-top: 1rem;
        }
        .section-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--electric-blue);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1.25rem;
        }
        .setting-control {
          margin-bottom: 1.5rem;
        }
        .setting-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .setting-meta .label {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-pure);
        }
        .setting-meta .value {
          font-family: monospace;
          color: var(--electric-blue);
          font-weight: 700;
        }
        .hint {
          font-size: 0.75rem;
          color: var(--text-low);
          margin-top: 0.5rem;
          line-height: 1.4;
        }
        .premium-slider {
          width: 100%;
          accent-color: var(--electric-blue);
          height: 4px;
          border-radius: 2px;
          cursor: pointer;
        }
        .setting-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .permission-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border-glass);
          font-size: 0.9rem;
          font-weight: 600;
        }
        .status.ok { color: var(--electric-blue); }
        .status.warn { color: var(--alert-red); }
        .settings-saved-toast {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          background: var(--electric-blue);
          color: var(--bg-space);
          padding: 0.5rem 1.5rem;
          border-radius: var(--radius-pill);
          font-weight: 800;
          z-index: 1000;
          box-shadow: var(--glow-blue);
        }
      `}</style>
    </motion.div>
  );
}
