import { useState } from 'react';
import { motion } from 'framer-motion';
import { SUPPORTED_LANGUAGES } from '../config/languages';
import AppLogo from '../components/AppLogo';

export default function LanguageSelect({ onSelect }) {
  const [selectedCode, setSelectedCode] = useState('en-IN');
  const [loading, setLoading] = useState(false);

  const confirmLanguage = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('preferredLanguage', selectedCode);
      if (onSelect) onSelect(selectedCode);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="native-login-host">
      {/* Background Graphic */}
      <div className="login-backdrop">
        <div className="orb orb-1" />
        <div className="orb orb-2" style={{ background: 'var(--safety-cyan)' }} />
        <div className="grid-overlay" />
      </div>

      <motion.div 
        className="login-content safe-area-padding"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="brand-header" style={{ marginBottom: '1.5rem' }}>
          <AppLogo size={80} />
          <h1 className="brand-title" style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>Voice Protocol</h1>
          <p className="brand-sub">Select Agent Language</p>
        </div>

        <div className="form-card" style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
           <p className="text-center text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">
               India Regional Support
           </p>

           <div className="language-grid">
               {SUPPORTED_LANGUAGES.map((lang) => {
                  const isActive = selectedCode === lang.code;
                  return (
                      <motion.div 
                          key={lang.code}
                          className={`lang-card ${isActive ? 'active' : ''}`}
                          onClick={() => setSelectedCode(lang.code)}
                          whileTap={{ scale: 0.95 }}
                      >
                          <div className="lang-native">{lang.nativeName}</div>
                          <div className="lang-en">{lang.name}</div>
                          {isActive && <div className="lang-check">✓</div>}
                      </motion.div>
                  )
               })}
           </div>

        </div>

        <div className="action-area" style={{ marginTop: '1.5rem' }}>
          <button onClick={confirmLanguage} className="native-fab ripple" disabled={loading}>
            {loading ? <span className="spinner" /> : "Initialize System"}
          </button>
        </div>
      </motion.div>

      <style>{`
        .language-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            padding-bottom: 2rem;
        }
        .lang-card {
            background: rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 1rem;
            text-align: center;
            position: relative;
            cursor: pointer;
            transition: all 0.2s;
        }
        .lang-card.active {
            border-color: var(--electric-blue);
            background: rgba(0, 242, 255, 0.1);
            box-shadow: 0 5px 15px rgba(0, 242, 255, 0.2);
        }
        .lang-native {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--text-pure);
            margin-bottom: 0.25rem;
        }
        .lang-en {
            font-size: 0.75rem;
            color: var(--text-mid);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
        }
        .lang-check {
            position: absolute;
            top: 8px;
            right: 12px;
            color: var(--electric-blue);
            font-weight: 900;
        }
      `}</style>
    </div>
  );
}
