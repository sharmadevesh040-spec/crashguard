/**
 * Accelerometer Service
 * Monitors device motion to detect sudden impacts (potential accidents).
 */

import { AICrashDetector } from './aiDetector';

const GRAVITY = 9.81;

export class AccelerometerService {
  constructor(options = {}) {
    this.threshold = options.threshold || 30; // m/s² — force threshold for impact
    this.cooldownMs = options.cooldownMs || 5000;
    this.onReading = options.onReading || (() => {});
    this.onImpact = options.onImpact || (() => {});
    this.onError = options.onError || (() => {});

    this._handler = null;
    this._lastImpactTime = 0;
    this._isMonitoring = false;
    this._history = []; // last 30 seconds of readings
    this._maxHistory = 300; // ~10 readings/sec × 30 sec
    
    // AI Verification states
    this._verifyingImpact = false;
    this._verificationStart = 0;
    this._impactForce = 0;
    this._impactReading = null;
  }

  get isMonitoring() {
    return this._isMonitoring;
  }

  get history() {
    return this._history;
  }

  setThreshold(value) {
    this.threshold = value;
  }

  async requestPermission() {
    // iOS 13+ requires explicit permission
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        return permission === 'granted';
      } catch (err) {
        this.onError('Motion sensor permission denied');
        return false;
      }
    }
    return true; // Android / desktop — no permission needed
  }

  start() {
    if (this._isMonitoring) return;

    if (!('DeviceMotionEvent' in window)) {
      this.onError('Device motion not supported on this device');
      return false;
    }

    this._handler = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;

      // Resultant acceleration magnitude
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Net force (subtract gravity)
      const netForce = Math.abs(magnitude - GRAVITY);

      const reading = {
        x: parseFloat(x.toFixed(2)),
        y: parseFloat(y.toFixed(2)),
        z: parseFloat(z.toFixed(2)),
        magnitude: parseFloat(magnitude.toFixed(2)),
        netForce: parseFloat(netForce.toFixed(2)),
        timestamp: Date.now()
      };

      // Store in history
      this._history.push(reading);
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }

      this.onReading(reading);

      // Impact detection
      const now = Date.now();
      
      if (this._verifyingImpact) {
        if (now - this._verificationStart > 1500) { // Gather 1.5s post-impact
          this._verifyingImpact = false;
          const analysis = AICrashDetector.analyzeImpact(this._history, this.threshold);
          
          if (analysis.confidence < 50) {
            console.log(`[AI System] Ignored impact: ${analysis.classification} (Confidence: ${analysis.confidence}%)`);
            // false positive ignored
          } else {
            console.log(`[AI System] Verified Crash: ${analysis.classification} (Confidence: ${analysis.confidence}%)`);
            this.onImpact({
              force: this._impactForce,
              reading: this._impactReading,
              timestamp: this._verificationStart,
              aiAnalysis: analysis
            });
          }
        }
        return;
      }

      if (netForce > this.threshold && (now - this._lastImpactTime) > this.cooldownMs) {
        this._lastImpactTime = now;
        this._verifyingImpact = true;
        this._verificationStart = now;
        this._impactForce = netForce;
        this._impactReading = reading;
      }
    };

    window.addEventListener('devicemotion', this._handler, true);
    this._isMonitoring = true;
    return true;
  }

  stop() {
    if (this._handler) {
      window.removeEventListener('devicemotion', this._handler, true);
      this._handler = null;
    }
    this._isMonitoring = false;
  }

  clearHistory() {
    this._history = [];
  }

  destroy() {
    this.stop();
    this.clearHistory();
  }
}

/**
 * Generate simulated accelerometer readings for testing on desktop.
 */
export class SimulatedAccelerometer {
  constructor(options = {}) {
    this.threshold = options.threshold || 30;
    this.onReading = options.onReading || (() => {});
    this.onImpact = options.onImpact || (() => {});
    this.onError = options.onError || (() => {});

    this._interval = null;
    this._isMonitoring = false;
    this._history = [];
    this._maxHistory = 300;
    this._lastImpactTime = 0;
    this.cooldownMs = options.cooldownMs || 5000;

    this._verifyingImpact = false;
    this._verificationStart = 0;
    this._impactForce = 0;
    this._impactReading = null;
    this._simulationMode = 'normal'; // 'normal', 'chaos', 'settle', 'freefall'
  }

  get isMonitoring() {
    return this._isMonitoring;
  }

  get history() {
    return this._history;
  }

  setThreshold(value) {
    this.threshold = value;
  }

  async requestPermission() {
    return true;
  }

  start() {
    if (this._isMonitoring) return true;

    this._interval = setInterval(() => {
      // Simulate motion based on mode
      let x = (Math.random() - 0.5) * 2;
      let y = (Math.random() - 0.5) * 2;
      let z = GRAVITY + (Math.random() - 0.5) * 1;

      if (this._simulationMode === 'chaos') {
         x += (Math.random() - 0.5) * 60;
         y += (Math.random() - 0.5) * 60;
         z += (Math.random() - 0.5) * 50;
      } else if (this._simulationMode === 'freefall') {
         z = (Math.random() - 0.5) * 1.5; // near 0 gravity magnitude
      } else if (this._simulationMode === 'settle') {
         x *= 0.1; y *= 0.1; z = GRAVITY + (Math.random() - 0.5) * 0.2;
      }

      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const netForce = Math.abs(magnitude - GRAVITY);

      const reading = {
        x: parseFloat(x.toFixed(2)),
        y: parseFloat(y.toFixed(2)),
        z: parseFloat(z.toFixed(2)),
        magnitude: parseFloat(magnitude.toFixed(2)),
        netForce: parseFloat(netForce.toFixed(2)),
        timestamp: Date.now()
      };

      this._history.push(reading);
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }

      this.onReading(reading);

      // AI Verification
      const now = Date.now();
      if (this._verifyingImpact) {
        if (now - this._verificationStart > 1500) {
          this._verifyingImpact = false;
          this._simulationMode = 'normal'; // Reset mode after verification
          const analysis = AICrashDetector.analyzeImpact(this._history, this.threshold);
          
          if (analysis.confidence < 50) {
            console.log(`[AI System] Simulated ignored: ${analysis.classification} (${analysis.confidence}%)`);
          } else {
            console.log(`[AI System] Simulated Crash: ${analysis.classification} (${analysis.confidence}%)`);
            this.onImpact({
              force: this._impactForce,
              reading: this._impactReading,
              timestamp: this._verificationStart,
              aiAnalysis: analysis
            });
          }
        }
        return;
      }

      if (netForce > this.threshold && (now - this._lastImpactTime) > this.cooldownMs) {
        this._lastImpactTime = now;
        this._verifyingImpact = true;
        this._verificationStart = now;
        this._impactForce = netForce;
        this._impactReading = reading;
      }
    }, 100); // 10Hz

    this._isMonitoring = true;
    return true;
  }

  /**
   * 1. Simulated Drop: Freefall (0G) -> Initial big spike -> Settle
   */
  async simulatePhoneDrop() {
    if (!this._isMonitoring) return;
    console.log('[Test] Triggering Phone Drop sequence...');
    // 1. Freefall
    this._simulationMode = 'freefall';
    
    // 2. Spike after 200ms
    setTimeout(() => {
        const force = this.threshold + 20;
        this._history.push({ x: force, y: force, z: force, magnitude: force+GRAVITY, netForce: force, timestamp: Date.now() });
        this._simulationMode = 'settle'; // 3. Settle
    }, 250);
  }

  /**
   * 2. Simulated Crash: Initial big spike -> Chaos
   */
  async simulateRealCrash() {
    if (!this._isMonitoring) return;
    console.log('[Test] Triggering Severe Crash sequence...');
    // 1. Initial spike
    const force = this.threshold + 50;
    this._history.push({ x: force, y: force, z: force, magnitude: force+GRAVITY, netForce: force, timestamp: Date.now() });
    
    // 2. Chaos
    this._simulationMode = 'chaos';
  }

  simulateImpact(force = 40) {
     this.simulateRealCrash(); // map legacy tester to Real Crash
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this._isMonitoring = false;
  }

  clearHistory() {
    this._history = [];
  }

  destroy() {
    this.stop();
    this.clearHistory();
  }
}
