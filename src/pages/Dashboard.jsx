import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AccelerometerGauge from '../components/AccelerometerGauge';
import AccelerationChart from '../components/AccelerationChart';
import EmergencyCountdown from '../components/EmergencyCountdown';
import { AccelerometerService, SimulatedAccelerometer } from '../services/accelerometer';
import { GeolocationService } from '../services/geolocation';
import { loadSettings } from '../services/emergency';
import { getMedia } from '../services/storage';
import { startBackgroundMonitoring, stopBackgroundMonitoring, isBackgroundAvailable } from '../services/background';

export default function Dashboard({ isMonitoring: propIsMonitoring, setIsMonitoring: propSetIsMonitoring, onGpsStatusChange }) {
  const [localIsMonitoring, localSetIsMonitoring] = useState(false);
  const isMonitoring = propIsMonitoring !== undefined ? propIsMonitoring : localIsMonitoring;
  const setIsMonitoring = propSetIsMonitoring !== undefined ? propSetIsMonitoring : localSetIsMonitoring;

  const [currentForce, setCurrentForce] = useState(0);
  const [history, setHistory] = useState([]);
  const [position, setPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('off');
  const [impactDetected, setImpactDetected] = useState(false);
  const [lastImpact, setLastImpact] = useState(null);
  const [error, setError] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [bgActive, setBgActive] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const accelRef = useRef(null);
  const geoRef = useRef(null);
  const settings = loadSettings();
  
  const pilotName = localStorage.getItem('pilotName') || 'Pilot';
  const pilotPhone = localStorage.getItem('pilotPhone') || 'Unknown';
  const emergencyContact = localStorage.getItem('emergencyContact') || 'None';

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsDesktop(!isMobile);
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    try {
      const { getAllIncidents } = await import('../services/storage');
      const incidents = await getAllIncidents();
      if (incidents && incidents.length > 0) {
        const latest = incidents[0];
        setVideoUrl(URL.createObjectURL(latest.video));
        // Use the photo from the record if available
        if (latest.photo) {
          localStorage.setItem('last_accident_photo', latest.photo);
        }
      }
    } catch (e) {
      console.warn('Could not load evidence:', e);
    }
  };

  const handleReading = useCallback((data) => {
    setCurrentForce(data.netForce);
    setHistory(prev => {
      const next = [...prev, data];
      return next.length > 200 ? next.slice(-200) : next;
    });
  }, []);

  const handleImpact = useCallback((impact) => {
    setLastImpact(impact);
    setImpactDetected(true);
  }, []);

  const handleGpsUpdate = useCallback((pos) => {
    setPosition(pos);
    setGpsStatus('active');
    if (onGpsStatusChange) onGpsStatusChange(true);
  }, [onGpsStatusChange]);

  const startMonitoring = async () => {
    const opts = {
      threshold: settings.threshold,
      onReading: handleReading,
      onImpact: handleImpact,
      onError: (msg) => setError(msg)
    };

    const AccelClass = isDesktop ? SimulatedAccelerometer : AccelerometerService;
    const accel = new AccelClass(opts);

    const permitted = await accel.requestPermission();
    if (!permitted) {
      setError('Accelerometer permission denied');
      return;
    }

    accel.start();
    accelRef.current = accel;

    const geo = new GeolocationService({
      onUpdate: handleGpsUpdate,
      onError: (msg) => {
        setGpsStatus('error');
        setError(msg);
        if (onGpsStatusChange) onGpsStatusChange(false);
      }
    });
    geo.startTracking();
    geoRef.current = geo;

    if (isBackgroundAvailable()) {
      const bgResult = await startBackgroundMonitoring();
      setBgActive(bgResult.started);
    }

    setIsMonitoring(true);
    setError('');
  };

  const stopMonitoring = async () => {
    if (accelRef.current) accelRef.current.stop();
    if (geoRef.current) geoRef.current.stopTracking();
    if (isBackgroundAvailable()) {
      await stopBackgroundMonitoring();
      setBgActive(false);
    }
    setIsMonitoring(false);
    setCurrentForce(0);
    setGpsStatus('off');
    if (onGpsStatusChange) onGpsStatusChange(false);
  };

  const toggleMonitoring = () => {
    if (isMonitoring) stopMonitoring();
    else startMonitoring();
  };

  const simulateDrop = () => {
    if (accelRef.current && accelRef.current.simulatePhoneDrop) {
      accelRef.current.simulatePhoneDrop();
    }
  };

  const simulateCrash = () => {
    if (accelRef.current && accelRef.current.simulateRealCrash) {
      accelRef.current.simulateRealCrash();
    }
  };

  return (
    <motion.div 
      className="native-dashboard no-scrollbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <EmergencyCountdown
        active={impactDetected}
        duration={lastImpact && lastImpact.aiAnalysis && lastImpact.aiAnalysis.confidence <= 85 ? Math.max(20, settings.countdownDuration) : settings.countdownDuration}
        position={position}
        aiAnalysis={lastImpact?.aiAnalysis}
        onCancel={() => setImpactDetected(false)}
        onAlertSent={() => {}}
      />

      <div className="dashboard-content">
        {/* User Identity Card */}
        <div className="native-card identity-card">
          <div className="id-avatar">👨‍🚀</div>
          <div className="id-details">
            <h2 className="id-name">{pilotName}</h2>
            <p className="id-phone">{pilotPhone}</p>
          </div>
          <div className="id-sos-badge">
            <span className="sos-icon">🆘</span>
            <span>{emergencyContact}</span>
          </div>
        </div>

        {/* Massive Toggle Action */}
        <div className="action-hub">
          <button 
            className={`native-master-toggle ripple ${isMonitoring ? 'active-monitor' : ''}`}
            onClick={toggleMonitoring}
          >
            <div className={`status-indicator ${isMonitoring ? 'pulsing' : ''}`} />
            <span className="toggle-text">
              {isMonitoring ? 'MONITORING ACTIVE' : 'TAP TO MONITOR'}
            </span>
          </button>
        </div>

        {/* Horizontal Scroll Metrics Grid */}
        <div className="metrics-scroller no-scrollbar">
          <div className="native-card metric-card">
            <h4 className="metric-title">Live G-Force</h4>
            <div className="gauge-box">
               <AccelerometerGauge value={currentForce} max={50} threshold={settings.threshold} />
            </div>
          </div>
          
          <div className="native-card metric-card">
            <h4 className="metric-title">GPS Telemetry</h4>
            <div className="telemetry-box">
              {position ? (
                <div className="telemetry-grid">
                  <div className="t-row"><span className="t-label">LAT</span><span className="t-val">{position.latitude.toFixed(4)}</span></div>
                  <div className="t-row"><span className="t-label">LNG</span><span className="t-val">{position.longitude.toFixed(4)}</span></div>
                  <div className="t-row"><span className="t-label">ACC</span><span className="t-val">{Math.round(position.accuracy)}m</span></div>
                </div>
              ) : (
                <div className="t-searching animate-pulse">Scanning Satellites...</div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Card */}
        <div className="native-card timeline-card">
          <h4 className="metric-title">Impact Timeline</h4>
          <div className="chart-box">
            <AccelerationChart history={history} threshold={settings.threshold} />
          </div>
        </div>

        {/* Evidence Card */}
        {localStorage.getItem('last_accident_photo') && (
          <div className="native-card evidence-card">
            <h4 className="metric-title">Accident Evidence (Blackbox)</h4>
            <div className="evidence-grid">
              <div className="evidence-item photo-thumb">
                <img src={localStorage.getItem('last_accident_photo')} alt="Accident Snapshot" />
                <span className="ev-label">SECURE EVIDENCE</span>
              </div>
              <div className="evidence-details">
                <p>📸 High-resolution proof locked</p>
                <p>📹 Video segment secured</p>
                <p className="insurance-guarantee">Verified for insurance claims</p>
                <div className="evidence-actions">
                  <button 
                    className="btn-view-evidence"
                    onClick={() => {
                        if (videoUrl) {
                            setShowPlayer(true);
                        } else {
                            alert('Evidence is secured in internal storage for insurance claims.');
                        }
                    }}
                  >
                    {videoUrl ? 'PLAY RECORD' : 'VIEW FULL RECORD'}
                  </button>
                  {videoUrl && (
                    <button 
                      className="btn-export-gallery"
                      onClick={async () => {
                        try {
                          const { getMedia } = await import('../services/storage');
                          const blob = await getMedia('latest_video');
                          if (blob) {
                            const { exportVideoToGallery } = await import('../services/mediaExport');
                            const res = await exportVideoToGallery(blob, `accident_video_${Date.now()}.mp4`);
                            if (res.success) alert('✅ Video saved to Movies/CrashGuard in your Gallery!');
                            else alert('❌ Failed to save to gallery');
                          }
                        } catch (e) {
                          alert('Error exporting video: ' + e.message);
                        }
                      }}
                    >
                      EXPORT
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showPlayer && videoUrl && (
            <motion.div 
               className="video-player-overlay"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="player-header">
                <button className="btn-back-player" onClick={() => setShowPlayer(false)}>
                  ← BACK TO DASHBOARD
                </button>
                <h3 className="player-title">Accident Evidence</h3>
              </div>
              
              <div className="video-viewport">
                <video src={videoUrl} controls autoPlay className="player-video-tag" />
              </div>
              
              <div className="player-footer">
                <p>Recorded during latest alert event</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isDesktop && isMonitoring && (
          <div className="simulation-pad">
            <button className="native-test-btn drop-btn ripple" onClick={simulateDrop}>
              📱 SIMULATE DROP
            </button>
            <button className="native-test-btn crash-btn ripple" onClick={simulateCrash}>
              💥 SIMULATE CRASH
            </button>
          </div>
        )}

        {error && <div className="native-toast">{error}</div>}
      </div>

      <style>{`
        .native-dashboard {
          padding-bottom: 7rem;
          min-height: 100vh;
          overflow-y: auto;
          background: #050810;
        }

        .dashboard-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .native-card {
          background: rgba(16, 22, 36, 0.8);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 28px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .identity-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }
        .id-avatar {
          width: 60px;
          height: 60px;
          background: rgba(0, 242, 255, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          border: 1px solid rgba(0, 242, 255, 0.2);
        }
        .id-details { flex: 1; }
        .id-name { font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.1rem; }
        .id-phone { font-size: 0.85rem; color: var(--text-mid); font-weight: 600; }
        .id-sos-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: rgba(255, 59, 59, 0.1);
          border-bottom-left-radius: 20px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--alert-red);
          border-left: 1px solid rgba(255, 59, 59, 0.2);
          border-bottom: 1px solid rgba(255, 59, 59, 0.2);
        }

        .action-hub { padding: 0.5rem 0; }
        .native-master-toggle {
          width: 100%;
          padding: 2rem;
          border-radius: 32px;
          border: none;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .native-master-toggle.active-monitor {
          background: rgba(0, 242, 255, 0.05);
          border-color: rgba(0, 242, 255, 0.3);
          box-shadow: 0 0 40px rgba(0, 242, 255, 0.1) inset,
                      0 10px 40px rgba(0,0,0,0.5);
        }
        .status-indicator {
          width: 80px;
          height: 80px;
          border-radius: 40px;
          background: #1e293b;
          transition: 0.4s;
          position: relative;
        }
        .status-indicator.pulsing {
          background: var(--electric-blue);
          box-shadow: 0 0 30px var(--electric-blue);
        }
        .status-indicator.pulsing::after {
          content: ""; position: absolute; inset: -20px;
          border: 2px solid var(--electric-blue);
          border-radius: 50%;
          animation: radarWave 2s infinite ease-out;
        }
        @keyframes radarWave {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .toggle-text {
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          color: var(--text-high);
        }
        .active-monitor .toggle-text { color: var(--electric-blue); }

        .metrics-scroller {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          snap-type: x mandatory;
        }
        .metric-card {
          flex: 0 0 85%;
          scroll-snap-align: center;
          display: flex;
          flex-direction: column;
          height: 240px;
        }
        .metric-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-mid);
          font-weight: 800;
          margin-bottom: 1rem;
        }
        .gauge-box, .chart-box {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .telemetry-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .telemetry-grid {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .t-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; }
        .t-row:last-child { border: none; padding: 0; }
        .t-label { color: var(--electric-blue); font-weight: 800; font-size: 0.8rem; }
        .t-val { font-size: 1.1rem; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
        .t-searching { color: var(--warning-amber); font-weight: 600; font-size: 0.9rem; text-align: center; padding: 2rem; background: rgba(251, 191, 36, 0.1); border-radius: 12px; }

        .evidence-card { border-color: rgba(0, 242, 255, 0.2); }
        .evidence-grid { display: flex; gap: 1rem; align-items: center; }
        .photo-thumb { 
          width: 80px; 
          height: 80px; 
          border-radius: 12px; 
          overflow: hidden; 
          position: relative;
          border: 1px solid var(--electric-blue);
        }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ev-label {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: rgba(0, 242, 255, 0.8);
          color: #000;
          font-size: 0.6rem;
          font-weight: 900;
          text-align: center;
          padding: 2px 0;
        }
        .evidence-details { flex: 1; font-size: 0.8rem; color: var(--text-mid); }
        .insurance-guarantee {
          color: var(--electric-blue);
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.2rem;
          opacity: 0.8;
          font-style: italic;
        }
        .evidence-actions { display: flex; gap: 0.5rem; }
        .btn-view-evidence {
          margin-top: 0.5rem;
          background: transparent;
          border: 1px solid var(--electric-blue);
          color: var(--electric-blue);
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 800;
          cursor: pointer;
        }
        .btn-export-gallery {
          margin-top: 0.5rem;
          margin-left: 0.5rem;
          background: var(--electric-blue);
          border: none;
          color: var(--bg-space);
          padding: 0.45rem 0.8rem;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0, 242, 255, 0.3);
        }

        .video-player-overlay {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 2000;
          display: flex;
          flex-direction: column;
        }
        .player-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--bg-glass);
          border-bottom: 1px solid var(--border-glass);
        }
        .btn-back-player {
          background: var(--bg-glass-heavy);
          border: 1px solid var(--border-glass);
          color: #fff;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
        }
        .player-title { font-size: 1rem; color: var(--electric-blue); font-weight: 800; }
        .video-viewport {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          padding: 1rem;
        }
        .player-video-tag {
          width: 100%;
          max-height: 80vh;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 242, 255, 0.2);
        }
        .player-footer {
          padding: 1.5rem;
          text-align: center;
          color: var(--text-low);
          font-size: 0.8rem;
          font-style: italic;
        }

        .simulation-pad {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .native-test-btn {
          flex: 1;
          padding: 1.5rem 1rem;
          border-radius: 20px;
          font-weight: 900;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
        }
        .drop-btn {
          background: rgba(251, 191, 36, 0.15);
          color: var(--warning-amber);
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .crash-btn {
          background: rgba(255, 59, 59, 0.15);
          color: var(--alert-red);
          border: 1px solid rgba(255, 59, 59, 0.3);
        }
        .native-toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 59, 59, 0.9);
          color: #fff;
          padding: 1rem 2rem;
          border-radius: 99px;
          font-weight: 800;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          z-index: 3000;
        }
      `}</style>
    </motion.div>
  );
}
