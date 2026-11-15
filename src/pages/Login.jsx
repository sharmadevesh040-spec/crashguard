import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLogo from '../components/AppLogo';
import EmergencySuccess from '../components/EmergencySuccess';
import './Login.css';

export default function Login({ onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMSG('');
    if (!name || !phone || !emergencyPhone) {
      setErrorMSG('All fields are mandatory.');
      return;
    }
    setLoading(true);

    // Simulate a "System Sync" or "Authentication" delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      localStorage.setItem('pilotName', name);
      localStorage.setItem('pilotPhone', phone);
      localStorage.setItem('emergencyContact', emergencyPhone);
      localStorage.setItem('isLoggedIn', 'true');
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMSG('Core sync failure. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return <EmergencySuccess onComplete={onSuccess} />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="native-login-host">
      {/* Dynamic Background */}
      <div className="login-backdrop">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="grid-overlay" />
        <div className="scanline" />
      </div>

      <motion.div 
        className="safe-area-padding"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="brand-header" variants={itemVariants}>
          <AppLogo size={120} />
          <h1 className="brand-title">CRASHGUARD</h1>
          <p className="brand-sub">Neural Safety Protocol</p>
        </motion.div>

        <motion.form 
          onSubmit={handleSubmit} 
          className="form-card"
          variants={itemVariants}
        >
          {/* HUD Decorative Elements */}
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />

          <motion.div className="native-input-box" variants={itemVariants}>
            <span className="native-label">Pilot Designation</span>
            <input 
              type="text" 
              className="native-input" 
              placeholder="Enter Full Name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </motion.div>

          <motion.div className="native-input-box" variants={itemVariants}>
            <span className="native-label">Secure Comm Line</span>
            <input 
              type="tel" 
              className="native-input" 
              placeholder="+91 XXXXX XXXXX" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
            />
          </motion.div>

          <motion.div className="native-input-box important-box" variants={itemVariants}>
            <span className="native-label">Emergency Protocol Vector</span>
            <input 
              type="tel" 
              className="native-input" 
              style={{ borderColor: 'rgba(255, 59, 59, 0.3)' }}
              placeholder="SOS Contact Number" 
              value={emergencyPhone} 
              onChange={e => setEmergencyPhone(e.target.value)} 
              required 
            />
          </motion.div>

          <AnimatePresence>
            {errorMSG && (
              <motion.div 
                className="error-banner"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                {errorMSG}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="action-area" variants={itemVariants}>
            <button 
              id="get-access-btn" 
              type="submit" 
              className="native-fab ripple" 
              disabled={loading}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span className="spinner" />
                  <span>SYNCHRONIZING...</span>
                </div>
              ) : 'INITIALIZE SYSTEM'}
            </button>
          </motion.div>
        </motion.form>
      </motion.div>

      <style>{`
        /* Embedded micro-animations for interactivity */
        .ripple {
          position: relative;
          overflow: hidden;
        }
        
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 100 900;
          font-display: swap;
          src: url(https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.woff2) format('woff2');
        }
      `}</style>
    </div>
  );
}
