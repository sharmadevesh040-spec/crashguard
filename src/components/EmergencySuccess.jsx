import { motion } from 'framer-motion';

export default function EmergencySuccess({ onComplete }) {
  return (
    <motion.div 
      className="emergency-confirmation-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="confirmation-card glass-card"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 15 }}
      >
        <div className="check-icon-container">
          <motion.svg 
            viewBox="0 0 52 52" 
            className="check-svg"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.circle cx="26" cy="26" r="25" fill="none" stroke="var(--electric-blue)" strokeWidth="2" />
            <motion.path 
              d="M14.1 27.2l7.1 7.2 16.7-16.8" 
              fill="none" 
              stroke="var(--electric-blue)" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </motion.svg>
        </div>
        <h3>Alert System Ready</h3>
        <p>Your emergency contact has been verified and "Auto Alert" is now active.</p>
        <motion.button 
          className="btn btn-primary btn-full"
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
        >
          Confirm Activation
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
