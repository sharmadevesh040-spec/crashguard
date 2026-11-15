// src/services/aiDetector.js

/**
 * Feature extraction and classification heuristic acting as a lightweight AI model
 */
export class AICrashDetector {
  /**
   * Analyzes an array of sensor readings to classify the impact.
   * Expected timeframe: ~2 seconds before impact to ~1.5 seconds after.
   * @param {Array} history - Array of { x, y, z, magnitude, netForce, timestamp }
   * @param {Number} threshold - The trigger threshold
   * @returns {Object} { confidence: Number (0-100), classification: String }
   */
  static analyzeImpact(history, threshold) {
    if (!history || history.length < 5) {
      return { confidence: 0, classification: 'Insufficient Data' };
    }

    // Find the peak impact index
    let peakIndex = 0;
    let maxForce = 0;
    history.forEach((reading, i) => {
      if (reading.netForce > maxForce) {
        maxForce = reading.netForce;
        peakIndex = i;
      }
    });

    const peakHit = history[peakIndex];
    if (peakHit.netForce < threshold * 0.8) {
       return { confidence: 0, classification: 'Below Threshold / Minor Bump' };
    }

    // Split into pre-impact and post-impact
    const preImpact = history.slice(0, peakIndex);
    const postImpact = history.slice(peakIndex + 1);

    // Feature 1: Pre-impact Freefall Analysis (Phone Drops)
    let freefallCount = 0;
    preImpact.forEach(r => {
      // magnitude near 0 means freefall.
      if (r.magnitude < 3.5) freefallCount++;
    });
    
    // Convert to approximate time
    const dtTotal = preImpact.length > 1 ? preImpact[preImpact.length-1].timestamp - preImpact[0].timestamp : 0;
    const hzApprox = preImpact.length / (dtTotal / 1000 || 1);
    const freefallDurationMs = (freefallCount / (hzApprox || 10)) * 1000;
    
    const experiencedFreefall = freefallDurationMs > 100; // if it was tumbling > 100ms before hit

    // Feature 2: Post-impact Variance (Settling vs Sustained Chaos)
    let postImpactEnergy = 0;
    postImpact.forEach(r => {
      postImpactEnergy += r.netForce;
    });
    const avgPostEnergy = postImpact.length ? postImpactEnergy / postImpact.length : 0;

    // Feature 3: Standard Deviation/Variance of post-impact motion
    let varianceSum = 0;
    postImpact.forEach(r => {
      varianceSum += Math.pow(r.netForce - avgPostEnergy, 2);
    });
    const postImpactVariance = postImpact.length ? varianceSum / postImpact.length : 0;

    // Classification Logic
    let confidence = 95; // Assume true crash initially
    let classification = 'Crash Detected';

    // Penalty for freefall (very indicative of a phone drop)
    if (experiencedFreefall) {
      confidence -= 40;
      classification = 'Probable Phone Drop (Freefall detected)';
    }

    // Penalty for quick settling
    if (avgPostEnergy < 5 && postImpactVariance < 15) {
      confidence -= 35;
      if (experiencedFreefall) {
          classification = 'Dropped Phone (Settled instantly)';
      } else {
          classification = 'Hard Brake / Pothole';
      }
    } else if (postImpactVariance > 25) {
      // Bonus: tumbling and chaos after hit
      confidence = Math.min(100, confidence + 10);
      classification = 'Severe Collision With Rollover';
    }

    confidence = Math.max(0, Math.min(100, Math.round(confidence)));

    return {
      confidence,
      classification,
      features: {
        freefallMs: Math.round(freefallDurationMs),
        avgPostEnergy: Math.round(avgPostEnergy),
        postImpactVariance: Math.round(postImpactVariance)
      }
    };
  }
}
