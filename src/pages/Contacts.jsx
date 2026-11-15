import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getContacts, saveContacts } from '../services/emergency';

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Doctor', 'Other'];

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', backupPhone: '', relationship: 'Friend' });

  useEffect(() => {
    setContacts(getContacts());
  }, []);

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    const updated = [...contacts, { ...form, id: Date.now() }];
    setContacts(updated);
    saveContacts(updated);
    setShowModal(false);
    setForm({ name: '', phone: '', backupPhone: '', relationship: 'Friend' });
  };

  const deleteContact = (id) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    saveContacts(updated);
  };

  return (
    <motion.div 
      className="contacts-page page-container no-scrollbar"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="page-header">
        <h2 className="page-title">Safety Circle</h2>
        <p className="page-subtitle">Your frontline emergency relay network</p>
      </div>

      <button className="btn btn-primary btn-full shadow-glow ripple" onClick={() => setShowModal(true)}>
        ➕ Expand Circle
      </button>

      <div className="contacts-list-container">
        <AnimatePresence>
          {contacts.map(c => (
            <motion.div 
              key={c.id} 
              className="glass-card contact-item-premium"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="contact-core">
                <div className="avatar-shield">🛡️</div>
                <div className="text-meta">
                  <div className="contact-name-txt">{c.name}</div>
                  <div className="contact-rel-txt">{c.relationship} • {c.phone}</div>
                  {c.backupPhone && (
                    <div className="contact-backup-txt">📞 Backup: {c.backupPhone}</div>
                  )}
                </div>
              </div>
              <button className="btn-remove-contact" onClick={() => deleteContact(c.id)}>🗑️</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showModal && (
        <div className="premium-modal-overlay">
          <motion.div 
            className="glass-card premium-modal-box"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="modal-headline">Secure New Guard</h3>
            <div className="modal-fields">
               <div className="field-group">
                 <label className="neon-label">Guard Identity</label>
                 <input className="neon-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Name" />
               </div>
               <div className="field-group">
                 <label className="neon-label">Relay Line (Primary)</label>
                 <input className="neon-input" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Primary Phone" />
               </div>
               <div className="field-group">
                 <label className="neon-label">Backup Line <span className="optional-tag">(optional)</span></label>
                 <input className="neon-input" type="tel" value={form.backupPhone} onChange={e => setForm({...form, backupPhone: e.target.value})} placeholder="Backup Phone (auto-called if no answer)" />
               </div>
               <div className="field-group">
                 <label className="neon-label">Response Role</label>
                 <select className="neon-input" value={form.relationship} onChange={e => setForm({...form, relationship: e.target.value})}>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                 </select>
               </div>
               <div className="modal-footer">
                 <button className="btn btn-primary ripple" style={{ flex: 1 }} onClick={handleSave}>Confirm</button>
                 <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
               </div>
            </div>
          </motion.div>
        </div>
      )}

      <style>{`
        .contacts-page { padding: 1.5rem; padding-bottom: 7.5rem; }
        .page-header { margin: 1rem 0 2rem; }
        .contacts-list-container { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.85rem; }
        .contact-item-premium { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem !important; }
        .contact-core { display: flex; align-items: center; gap: 1rem; }
        .avatar-shield { width: 44px; height: 44px; background: rgba(0, 242, 255, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: 1px solid rgba(0, 242, 255, 0.2); }
        .contact-name-txt { font-weight: 800; color: var(--text-pure); font-size: 1rem; }
        .contact-rel-txt { font-size: 0.7rem; color: var(--electric-blue); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .contact-backup-txt { font-size: 0.7rem; color: var(--warning-amber, #f59e0b); font-weight: 600; margin-top: 0.15rem; }
        .btn-remove-contact { background: none; border: none; font-size: 1.1rem; cursor: pointer; opacity: 0.4; transition: 0.2s; }
        .btn-remove-contact:hover { opacity: 1; color: var(--alert-red); }
        
        .premium-modal-overlay { position: fixed; inset: 0; background: rgba(10, 14, 26, 0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 1.5rem; backdrop-filter: blur(25px); }
        .premium-modal-box { width: 100%; max-width: 400px; padding: 2.5rem !important; border: 1px solid rgba(255,255,255,0.1); }
        .modal-headline { font-size: 1.5rem; font-weight: 900; margin-bottom: 2rem; text-align: center; color: var(--text-pure); letter-spacing: -0.02em; }
        .modal-fields { display: flex; flex-direction: column; gap: 1.5rem; }
        .field-group { display: flex; flex-direction: column; gap: 0.6rem; }
        .neon-label { font-size: 0.75rem; font-weight: 800; color: var(--text-low); text-transform: uppercase; letter-spacing: 0.1em; }
        .optional-tag { font-weight: 500; text-transform: none; font-size: 0.7rem; color: var(--text-mid); letter-spacing: 0; }
        .modal-footer { display: flex; gap: 1rem; margin-top: 1rem; }
        .shadow-glow { box-shadow: var(--glow-blue); }
      `}</style>
    </motion.div>
  );
}
