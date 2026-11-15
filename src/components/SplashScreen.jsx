import React, { useEffect, useState } from 'react';
import './SplashScreen.css';
import logo from '../assets/logo.png';

const SplashScreen = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show splash for 2.5 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for exit animation to complete
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-screen ${isExiting ? 'splash-exit' : ''}`}>
      <div className="splash-glow"></div>
      <div className="splash-logo-container">
        <img src={logo} alt="Crash Guard Logo" className="splash-logo" />
      </div>
      <h2 className="splash-text">CRASH GUARD</h2>
      <div className="loading-bar-container">
        <div className="loading-bar-progress"></div>
      </div>
    </div>
  );
};

export default SplashScreen;
