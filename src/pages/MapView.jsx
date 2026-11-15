import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { GeolocationService } from '../services/geolocation';
import { searchNearbyHospitals } from '../services/hospitals';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons just in case
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom Premium Markers
const hospitalIcon = new L.DivIcon({
  className: 'custom-hospital-marker',
  html: '<div class="hospital-cross-icon">✚</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
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

// Dynamic camera follow component
function MapUpdater({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, map, zoom]);
  return null;
}

export default function MapView() {
  const [position, setPosition] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const [showFilters, setShowFilters] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(true);
  
  const geoRef = useRef(null);

  useEffect(() => {
    const geo = new GeolocationService({
      onUpdate: (pos) => setPosition(pos),
      onError: (msg) => console.error(msg)
    });
    geo.startTracking();
    geoRef.current = geo;
    return () => geo.destroy();
  }, []);

  // Fetch initial hospitals once position is acquired
  useEffect(() => {
    if (position && hospitals.length === 0 && !loading) {
      handleSearch();
    }
  }, [position]);

  const handleSearch = async () => {
    if (!position) return;
    setLoading(true);
    setShowFilters(false);
    try {
      const results = await searchNearbyHospitals(position.latitude, position.longitude, searchRadius);
      // Sort by distance locally to ensure top 3 sorting is guaranteed
      const sorted = results.sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance));
      setHospitals(sorted);
      setShowBottomSheet(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="uber-map-host"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 1. Fullscreen Map Engine */}
      <div className="map-layer">
        <MapContainer 
          center={[20.5, 78.9]} 
          zoom={14} 
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Dark Mode Theme TileLayer */}
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          
          <MapUpdater center={position ? [position.latitude, position.longitude] : null} zoom={hospitals.length > 0 ? 13 : 15} />
          
          {position && (
             <>
                <Marker position={[position.latitude, position.longitude]} icon={userIcon} />
                <Circle 
                   center={[position.latitude, position.longitude]} 
                   pathOptions={{ fillColor: '#00f2ff', color: '#00f2ff', fillOpacity: 0.05, weight: 1 }} 
                   radius={searchRadius * 1000} 
                />
             </>
          )}

          {hospitals.map(h => (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={hospitalIcon}>
              <Popup className="premium-popup">
                  <strong>{h.name}</strong><br/>
                  {h.distance}km away
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 2. Floating Top Controls */}
      <div className="floating-top-bar glass-panel safe-top-padding">
        <div className="top-search-trigger" onClick={() => setShowFilters(!showFilters)}>
            <span className="search-icon">🔍</span>
            <span className="search-text">Medical Centers ({searchRadius}km)</span>
            <span className="search-filter-icon">⚙️</span>
        </div>

        <AnimatePresence>
            {showFilters && (
                <motion.div 
                   className="expanded-filters"
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                >
                    <div className="filter-slider-box">
                        <label>Search Radius: {searchRadius}km</label>
                        <input 
                            type="range" min="1" max="50" 
                            value={searchRadius} 
                            onChange={(e) => setSearchRadius(Number(e.target.value))} 
                            className="premium-range"
                        />
                    </div>
                    <button className="native-btn-solid ripple" onClick={handleSearch} disabled={loading}>
                        {loading ? 'Scanning Sector...' : 'Apply & Search'}
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* 3. Bottom Sliding Panel (Hospital Results) */}
      <AnimatePresence>
        {hospitals.length > 0 && showBottomSheet && (
            <motion.div 
               className="bottom-sheet-panel no-scrollbar"
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
                <div className="sheet-pill" onClick={() => setShowBottomSheet(false)} />
                <div className="sheet-header">
                    <h3 className="sheet-title">Facilities within {searchRadius}km</h3>
                    <button className="sheet-close-btn" onClick={() => setShowBottomSheet(false)}>✕</button>
                </div>
                
                <div className="hospital-list">
                    {hospitals.map(h => (
                    <motion.div 
                        key={h.id} 
                        className="hospital-item-card ripple"
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="h-icon-box">🏥</div>
                        <div className="h-info">
                            <span className="h-name">{h.name}</span>
                            <span className="h-dist-eta">
                                <span className="dist-badge">{h.distance}km</span>
                                <span className="eta-badge">~{Math.round(h.distance * 3)} mins</span>
                            </span>
                        </div>
                        <a href={`tel:${h.phone || '911'}`} className="h-call-btn">
                            📞
                        </a>
                    </motion.div>
                    ))}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Floating View List Button */}
      {!showBottomSheet && hospitals.length > 0 && (
          <motion.button
              className="view-list-fab glass-panel"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowBottomSheet(true)}
          >
              <span className="fab-icon">📋</span>
              <span className="fab-text">View List</span>
          </motion.button>
      )}

      <style>{`
        /* Host Layout */
        .uber-map-host {
            position: relative;
            height: 100vh;
            height: 100dvh;
            width: 100vw;
            overflow: hidden;
            background: #000;
        }

        .map-layer {
            position: absolute;
            inset: 0;
            z-index: 1; /* Lowest */
        }

        /* Marker CSS */
        .user-marker-container {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .user-pulse {
            position: absolute;
            width: 40px;
            height: 40px;
            background-color: rgba(0, 242, 255, 0.4);
            border-radius: 50%;
            animation: map-pulse 2s infinite ease-out;
        }
        .user-dot {
            width: 16px;
            height: 16px;
            background-color: var(--electric-blue);
            border: 3px solid #fff;
            border-radius: 50%;
            z-index: 2;
            box-shadow: 0 0 15px rgba(0, 242, 255, 0.8);
        }
        @keyframes map-pulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
        }

        .custom-hospital-marker {
            background: var(--alert-red);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            box-shadow: 0 4px 15px rgba(255, 59, 59, 0.6);
            border: 2px solid #fff;
            font-weight: 900;
        }

        /* Top Panel */
        .floating-top-bar {
            position: absolute;
            top: 2rem;
            left: 1.5rem;
            right: 1.5rem;
            z-index: 1000;
        }
        .safe-top-padding {
            margin-top: env(safe-area-inset-top);
        }
        .glass-panel {
            background: rgba(10, 14, 26, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .top-search-trigger {
            display: flex;
            align-items: center;
            padding: 1rem 1.25rem;
            gap: 1rem;
            cursor: pointer;
        }
        .search-icon { font-size: 1.25rem; }
        .search-text { flex: 1; font-weight: 700; color: var(--text-pure); font-size: 1rem; }
        .search-filter-icon { color: var(--text-mid); }

        .expanded-filters {
            border-top: 1px solid rgba(255,255,255,0.05);
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }
        .filter-slider-box label { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--text-mid); text-transform: uppercase; }
        .premium-range { width: 100%; accent-color: var(--electric-blue); height: 4px; border-radius: 2px; }
        
        /* Bottom Sheet Panel */
        .bottom-sheet-panel {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(5, 8, 16, 0.95);
            backdrop-filter: blur(20px);
            border-top-left-radius: 28px;
            border-top-right-radius: 28px;
            border-top: 1px solid rgba(255,255,255,0.1);
            z-index: 1000;
            padding: 1rem 1.5rem 6rem; /* extra padding for generic bottom navigation bar if present */
            box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .sheet-pill {
            width: 40px;
            height: 5px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            margin: 0 auto 1.5rem;
            cursor: pointer;
        }
        
        .sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.25rem;
        }

        .sheet-title {
            font-size: 1.2rem;
            font-weight: 800;
            margin-bottom: 0;
            color: var(--text-pure);
        }

        .sheet-close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: var(--text-mid);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.2s;
        }
        .sheet-close-btn:active {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(0.9);
        }

        .view-list-fab {
            position: absolute;
            bottom: 6rem;
            right: 1.5rem;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            border: none;
            color: var(--text-pure);
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(0, 242, 255, 0.3);
            border: 1px solid rgba(0, 242, 255, 0.2);
            cursor: pointer;
        }

        .hospital-list { display: flex; flex-direction: column; gap: 0.75rem; }
        
        .hospital-item-card {
            display: flex;
            align-items: center;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 1rem;
            gap: 1rem;
            text-decoration: none;
            color: inherit;
        }
        .h-icon-box {
            width: 45px;
            height: 45px;
            border-radius: 12px;
            background: rgba(255, 59, 59, 0.1);
            color: var(--alert-red);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
        .h-info { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
        .h-name { font-weight: 800; font-size: 1rem; color: var(--text-high); }
        .h-dist-eta { display: flex; gap: 0.5rem; align-items: center; }
        .dist-badge { 
            font-size: 0.75rem; 
            font-weight: 700; 
            color: var(--electric-blue); 
            background: rgba(0, 242, 255, 0.1); 
            padding: 0.2rem 0.5rem; 
            border-radius: 4px;
        }
        .eta-badge {
            font-size: 0.75rem;
            color: var(--text-mid);
            font-weight: 600;
        }

        .h-call-btn {
            width: 45px; height: 45px;
            border-radius: 50%;
            background: var(--bg-glass-heavy);
            border: 1px solid var(--border-glass);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.25rem;
            transition: all 0.2s;
            text-decoration: none;
        }
        .h-call-btn:active { background: var(--alert-red); transform: scale(0.9); border-color: transparent; }

        .premium-popup .leaflet-popup-content-wrapper { background: rgba(10, 14, 26, 0.9); color: #fff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .premium-popup .leaflet-popup-tip { background: rgba(10, 14, 26, 0.9); }
      `}</style>
    </motion.div>
  );
}
