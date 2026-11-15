import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchNearbyHospitals } from '../services/hospitals';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const hospitalIcon = new L.DivIcon({
  className: 'custom-hospital-marker',
  html: '<div class="hospital-cross-icon">✚</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const userIcon = new L.DivIcon({
  className: 'user-marker-container',
  html: `
    <div class="user-pulse"></div>
    <div class="user-dot"></div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapUpdater({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom, { animate: true, duration: 1.5 });
  }, [center, map, zoom]);
  return null;
}

export default function HospitalEmergencyOverlay({ position, onDone }) {
  const [nearest, setNearest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callCountdown, setCallCountdown] = useState(3);
  const [callInitiated, setCallInitiated] = useState(false);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [copied, setCopied] = useState(false);

  const emergencyContact = localStorage.getItem('emergencyContact') || '911';

  useEffect(() => {
    async function locate() {
      if (!position) return;
      try {
        const results = await searchNearbyHospitals(position.latitude, position.longitude, 20);
        if (results.length > 0) {
          const sorted = results.sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance));
          setNearest(sorted[0]);
        } else {
          setFallbackTriggered(true);
        }
      } catch (e) {
        setFallbackTriggered(true);
      } finally {
         setLoading(false);
      }
    }
    locate();
  }, [position]);

  // Handle countdown & dial
  useEffect(() => {
    if (nearest && !callInitiated && !loading) {
      if (callCountdown > 0) {
        const timer = setTimeout(() => setCallCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setCallInitiated(true);
        window.location.href = `tel:${nearest.phone || '911'}`;
      }
    }
    
    // Auto-call emergency if fallback triggered
    if (fallbackTriggered && !callInitiated && !loading) {
      if (callCountdown > 0) {
        const timer = setTimeout(() => setCallCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setCallInitiated(true);
        window.location.href = `tel:${emergencyContact}`;
      }
    }
  }, [nearest, callCountdown, callInitiated, loading, fallbackTriggered, emergencyContact]);

  const mapCenter = nearest 
    ? [(position.latitude + nearest.lat) / 2, (position.longitude + nearest.lng) / 2] 
    : position ? [position.latitude, position.longitude] : [20, 78];

  const mapsLink = position ? `https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(`Emergency! Accident detected. Patient location: ${mapsLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="hospital-overlay-host">
      {/* Background Map layer */}
      <div className="map-layer">
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapUpdater center={mapCenter} zoom={nearest ? 14 : 15} />
          
          {position && <Marker position={[position.latitude, position.longitude]} icon={userIcon} />}
          
          {nearest && (
             <Marker position={[nearest.lat, nearest.lng]} icon={hospitalIcon}>
               <Popup className="premium-popup">
                 <strong>{nearest.name}</strong><br/>
                 🏥 Nearest Trauma Center
               </Popup>
             </Marker>
          )}
        </MapContainer>
      </div>

      {/* Fore-ground UI Panels */}
      <div className="overlay-ui safe-area-padding">
         <motion.div 
            className="share-banner glass-panel"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
         >
            <div className="share-text">
               <strong>Emergency Info Share</strong>
               <p className="link-preview">Emergency! ... Patient location: {mapsLink.substring(0, 25)}...</p>
            </div>
            <button className="copy-btn ripple" onClick={copyLink}>
              {copied ? '✅ Copied' : '🔗 Copy URL'}
            </button>
         </motion.div>

         {/* Bottom Action Sheet */}
         <AnimatePresence>
            <motion.div 
               className="action-bottom-sheet glass-panel"
               initial={{ y: 300, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
            >
               {loading ? (
                   <div className="loading-view">
                       <span className="spinner-large" />
                       <h2>Finding nearest hospitals...</h2>
                       <p>Searching geographical sectors.</p>
                   </div>
               ) : fallbackTriggered ? (
                   <div className="fallback-view">
                       <h2 className="text-alert">No Hospital Found</h2>
                       <p>Rerouting to primary emergency contact...</p>
                       <div className="dialer-action">
                           Calling {emergencyContact} in {callCountdown}s...
                       </div>
                   </div>
               ) : nearest && (
                   <div className="hospital-dialer-view">
                       <div className="target-h-header">
                           <div className="h-avatar">🏥</div>
                           <div>
                              <h2 className="target-h-name">{nearest.name}</h2>
                              <p className="target-h-dist">{nearest.distance}km away</p>
                           </div>
                       </div>

                       <div className="dialer-status box-glow pulse-animation">
                           {callInitiated ? (
                               <span className="dialing-text">📞 Dialing {nearest.phone || nearest.name}...</span>
                           ) : (
                               <span className="dialing-text">Auto-Calling in {callCountdown}...</span>
                           )}
                       </div>
                   </div>
               )}

               <button className="native-btn-solid ripple mt-2 width-full" onClick={onDone}>
                   {callInitiated ? "Close Tracker" : "Abort Call"}
               </button>
            </motion.div>
         </AnimatePresence>
      </div>

      <style>{`
        .hospital-overlay-host {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          overflow: hidden;
        }

        .map-layer {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .overlay-ui {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5rem;
          pointer-events: none; /* Let clicks pass through to map where transparent */
        }
        .safe-area-padding { padding-top: calc(1.5rem + env(safe-area-inset-top)); padding-bottom: calc(1.5rem + env(safe-area-inset-bottom)); }

        .glass-panel {
          background: rgba(10, 14, 26, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          pointer-events: auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .share-banner {
          display: flex;
          align-items: center;
          padding: 1rem;
          gap: 1rem;
        }
        .share-text { flex: 1; overflow: hidden; }
        .share-text strong { display: block; color: var(--electric-blue); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
        .link-preview { font-size: 0.8rem; color: var(--text-mid); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
        
        .copy-btn { background: rgba(0, 242, 255, 0.1); color: var(--electric-blue); border: 1px solid rgba(0, 242, 255, 0.2); border-radius: 99px; padding: 0.6rem 1rem; font-weight: 700; font-size: 0.8rem; white-space: nowrap; }
        
        .action-bottom-sheet { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
        
        .loading-view, .fallback-view { text-align: center; padding: 1rem 0; }
        .loading-view h2, .fallback-view h2 { margin-top: 1rem; font-size: 1.25rem; font-weight: 800; color: #fff; }
        .loading-view p, .fallback-view p { color: var(--text-mid); font-size: 0.9rem; margin-top: 0.5rem; }
        
        .spinner-large { display: inline-block; width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--electric-blue); border-radius: 50%; animation: spin 1s infinite linear; }
        
        .target-h-header { display: flex; align-items: center; gap: 1rem; }
        .h-avatar { width: 50px; height: 50px; background: rgba(255, 59, 59, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 1px solid rgba(255, 59, 59, 0.2); }
        .target-h-name { font-size: 1.2rem; font-weight: 800; color: #fff; margin-bottom: 0.15rem; }
        .target-h-dist { color: var(--electric-blue); font-weight: 600; font-size: 0.85rem; }

        .dialer-status { padding: 1.25rem; border-radius: 16px; background: rgba(255, 59, 59, 0.1); border: 1px solid rgba(255, 59, 59, 0.3); text-align: center; margin-top: 1rem; }
        .dialing-text { font-size: 1.1rem; font-weight: 900; color: var(--alert-red); letter-spacing: 0.05em; }
        
        .pulse-animation { animation: dialerPulse 1s infinite alternate; }
        @keyframes dialerPulse { from { box-shadow: 0 0 10px rgba(255,59,59,0.1); } to { box-shadow: 0 0 25px rgba(255,59,59,0.4); } }
        
        .mt-2 { margin-top: 0.5rem; border: 1px solid rgba(255,255,255,0.1) !important; background: rgba(255,255,255,0.05); color: #fff !important; }
        .width-full { width: 100%; border-radius: 16px !important; padding: 1.25rem; font-size: 1rem; cursor: pointer; transition: 0.2s; font-weight: 700;}
      `}</style>
    </div>
  );
}
