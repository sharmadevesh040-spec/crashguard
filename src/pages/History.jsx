import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllIncidents, deleteIncident } from '../services/storage';
import { exportVideoToGallery } from '../services/mediaExport';

export default function History() {
  const [incidents, setIncidents] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await getAllIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this accident record?")) {
      await deleteIncident(id);
      loadIncidents();
    }
  };

  const handleExport = async (record) => {
    const res = await exportVideoToGallery(record.video, `${record.id}.mp4`);
    if (res.success) alert('✅ Saved to Gallery!');
    else alert('❌ Export failed');
  };

  return (
    <motion.div 
      className="page-container no-scrollbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="history-header">
        <h2 className="page-title">Accident Archives</h2>
        <span className="count-badge">{incidents.length} RECORDS</span>
      </div>

      <div className="records-container">
         {loading ? (
            <div className="loading-state">Initializing Database...</div>
         ) : incidents.length === 0 ? (
            <div className="empty-history-state box-glow">
               <span className="empty-icon">🛡️</span>
               <h3>Zero Incidents Logged</h3>
               <p>Your crash history is crystal clear.</p>
            </div>
         ) : (
            <div className="records-grid">
               {incidents.map((record) => (
                  <motion.div 
                     key={record.id} 
                     className="incident-card glass-panel"
                     initial={{ y: 20, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                  >
                     <div className="incident-thumb">
                        {record.photo ? (
                           <img src={record.photo} alt="Thumbnail" />
                        ) : (
                           <div className="no-photo">📹</div>
                        )}
                        <span className={`severity-tag ${record.metadata?.severity?.toLowerCase()}`}>
                           {record.metadata?.severity || 'Impact'}
                        </span>
                     </div>
                     
                     <div className="incident-info">
                        <div className="info-main">
                           <h4 className="incident-id">{record.id.replace('accident_', '').replace('_', ' ')}</h4>
                           <p className="incident-ts">{new Date(record.timestamp).toLocaleString()}</p>
                        </div>
                        
                        <div className="incident-actions">
                           <button className="act-btn play" onClick={() => setSelectedVideo(URL.createObjectURL(record.video))}>
                              PLAY
                           </button>
                           <button className="act-btn export" onClick={() => handleExport(record)}>
                              SAVE
                           </button>
                           <button className="act-btn delete" onClick={() => handleDelete(record.id)}>
                              🗑️
                           </button>
                        </div>
                     </div>

                     {record.metadata?.lat && (
                        <div className="incident-location">
                           📍 {record.metadata.lat.toFixed(4)}, {record.metadata.lng.toFixed(4)}
                        </div>
                     )}
                  </motion.div>
               ))}
            </div>
         )}
      </div>

      <AnimatePresence>
         {selectedVideo && (
            <motion.div 
               className="video-player-overlay"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
            >
               <div className="player-header">
                  <button className="btn-back-player" onClick={() => setSelectedVideo(null)}>← BACK</button>
                  <span className="player-title">Evidence Playback</span>
               </div>
               <div className="video-viewport">
                  <video src={selectedVideo} controls autoPlay className="player-video-tag" />
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <style>{`
         .history-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; margin-top: 1rem; }
         .count-badge { background: var(--bg-glass-heavy); color: var(--electric-blue); border: 1px solid var(--border-glass); padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.05em; }
         
         .records-container { padding: 0 1.5rem 7rem; }
         .loading-state { text-align: center; color: var(--electric-blue); padding: 4rem; font-weight: 800; }
         
         .empty-history-state { text-align: center; padding: 3rem 1.5rem; border-radius: 24px; background: rgba(0, 242, 255, 0.05); border: 1px solid rgba(0, 242, 255, 0.1); display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 2rem; }
         .empty-icon { font-size: 3rem; filter: drop-shadow(0 0 20px rgba(0, 242, 255, 0.6)); }
         
         .records-grid { display: flex; flex-direction: column; gap: 1rem; }
         .incident-card { display: flex; flex-direction: column; gap: 0.8rem; padding: 1rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
         
         .incident-thumb { position: relative; width: 100%; height: 120px; border-radius: 12px; overflow: hidden; background: #000; border: 1px solid rgba(0,242,255,0.2); }
         .incident-thumb img { width: 100%; height: 100%; object-fit: cover; }
         .no-photo { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
         
         .severity-tag { position: absolute; top: 0.5rem; left: 0.5rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; }
         .severity-tag.high { background: var(--alert-red); color: #fff; }
         .severity-tag.medium { background: var(--warning-amber); color: #000; }
         
         .incident-info { display: flex; justify-content: space-between; align-items: flex-end; }
         .incident-id { color: #fff; font-weight: 900; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
         .incident-ts { color: var(--text-low); font-size: 0.7rem; margin-top: 0.2rem; }
         
         .incident-actions { display: flex; gap: 0.5rem; }
         .act-btn { border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.4rem 0.8rem; font-size: 0.7rem; font-weight: 900; cursor: pointer; transition: 0.2s; }
         .act-btn.play { background: var(--electric-blue); color: #000; border: none; }
         .act-btn.export { background: transparent; color: var(--electric-blue); }
         .act-btn.delete { color: var(--alert-red); border-color: rgba(255, 59, 59, 0.2); }
         
         .incident-location { font-size: 0.7rem; color: var(--text-mid); font-family: monospace; background: rgba(0,0,0,0.3); padding: 0.3rem 0.6rem; border-radius: 6px; width: fit-content; }

         .video-player-overlay { position: fixed; inset: 0; background: #000; z-index: 2000; display: flex; flex-direction: column; }
         .player-header { padding: 1.5rem; display: flex; align-items: center; gap: 1rem; background: var(--bg-glass); border-bottom: 1px solid var(--border-glass); }
         .btn-back-player { background: var(--bg-glass-heavy); border: 1px solid var(--border-glass); color: #fff; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; }
         .player-title { font-size: 1rem; color: var(--electric-blue); font-weight: 800; }
         .video-viewport { flex: 1; display: flex; align-items: center; justify-content: center; }
         .player-video-tag { width: 100%; max-height: 80vh; }
      `}</style>
    </motion.div>
  );
}
