import { motion } from 'framer-motion';
import './BottomNav.css';

const tabs = [
  { id: 'dashboard', icon: '⚡', label: 'Monitor' },
  { id: 'map', icon: '📍', label: 'Safety' },
  { id: 'contacts', icon: '🛡️', label: 'Alerts' },
  { id: 'history', icon: '📜', label: 'Logs' },
  { id: 'settings', icon: '⚙️', label: 'Config' },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <motion.span 
              className="nav-icon"
              animate={activeTab === tab.id ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}
            >
              {tab.icon}
            </motion.span>
            <span className="nav-label">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="nav-indicator" 
                className="nav-indicator"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
