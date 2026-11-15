/**
 * Background Monitoring Service
 * Controls the native CrashGuard Foreground Service from JavaScript.
 * When running on Android, this starts a native service that:
 *   - Uses hardware SensorManager (works with screen off)
 *   - Tracks GPS location
 *   - Auto-sends SMS on impact detection
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getContacts, loadSettings } from './emergency';

let CrashGuard = null;
try {
  CrashGuard = registerPlugin('CrashGuard');
} catch (e) {
  // Plugin not available (web environment)
}

/**
 * Check if native background monitoring is available.
 */
export function isBackgroundAvailable() {
  return Capacitor.isNativePlatform() && CrashGuard !== null;
}

/**
 * Start the native foreground service for background monitoring.
 * Syncs current settings and contacts to the native layer.
 */
export async function startBackgroundMonitoring() {
  if (!isBackgroundAvailable()) {
    console.log('Background monitoring not available (web mode)');
    return { started: false, native: false };
  }

  const settings = loadSettings();
  const contacts = getContacts();

  try {
    const result = await CrashGuard.startMonitoring({
      threshold: settings.threshold,
      contacts: JSON.stringify(contacts),
      emergencyMessage: settings.emergencyMessage,
      emergencyNumber: settings.emergencyNumber || '112'
    });
    return { started: true, native: true };
  } catch (err) {
    console.error('Failed to start background monitoring:', err);
    return { started: false, native: true, error: err.message };
  }
}

/**
 * Stop the native foreground service.
 */
export async function stopBackgroundMonitoring() {
  if (!isBackgroundAvailable()) return { stopped: false, native: false };

  try {
    await CrashGuard.stopMonitoring();
    return { stopped: true, native: true };
  } catch (err) {
    console.error('Failed to stop background monitoring:', err);
    return { stopped: false, native: true, error: err.message };
  }
}

/**
 * Check if the foreground service is currently running.
 */
export async function isBackgroundRunning() {
  if (!isBackgroundAvailable()) return false;

  try {
    const result = await CrashGuard.isRunning();
    return result.running;
  } catch {
    return false;
  }
}
