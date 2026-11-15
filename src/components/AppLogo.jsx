import { motion } from 'framer-motion';

export default function AppLogo({ size = 120 }) {
  return (
    <motion.div 
      className="logo-container"
      style={{ width: size, height: size }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--electric-blue)" />
            <stop offset="100%" stopColor="var(--deep-indigo)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Outer Ring */}
        <motion.circle 
          cx="50" cy="50" r="45" 
          stroke="url(#logo-grad)" 
          strokeWidth="2" 
          strokeDasharray="20 10"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Shield Shape */}
        <path 
          d="M50 15L85 30V55C85 75 50 90 50 90C50 90 15 75 15 55V30L50 15Z" 
          fill="rgba(0, 242, 255, 0.1)" 
          stroke="url(#logo-grad)" 
          strokeWidth="4" 
          filter="url(#glow)"
        />
        
        {/* Bolt / Pulse Line */}
        <motion.path 
          d="M35 50H45L50 35L55 65L60 50H65" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
        />
      </svg>
    </motion.div>
  );
}
