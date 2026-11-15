/**
 * Emergency Alert Service
 * Manages countdown, SMS alerts, and browser notifications after impact detection.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

// Register the native SmsSender plugin (available on Android only)
let SmsSender = null;
try {
  SmsSender = registerPlugin('SmsSender');
} catch (e) {
  // Plugin not available (web environment)
}

// Register the native CrashGuard plugin (for auto-call)
let CrashGuard = null;
try {
  CrashGuard = registerPlugin('CrashGuard');
} catch (e) {
  // Plugin not available (web environment)
}

/**
 * Check if native SMS sending is available (running on Android with plugin).
 */
export function isNativeSmAvailable() {
  return Capacitor.isNativePlatform() && SmsSender !== null;
}

/**
 * Load saved contacts from localStorage.
 */
export function getContacts() {
  try {
    return JSON.parse(localStorage.getItem('emergencyContacts') || '[]');
  } catch {
    return [];
  }
}

/**
 * Save contacts to localStorage.
 */
export function saveContacts(contacts) {
  localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
}

/**
 * Load app settings.
 */
export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('appSettings') || '{}');
  } catch {
    return {};
  }
}

/**
 * Save app settings.
 */
export function saveSettings(settings) {
  localStorage.setItem('appSettings', JSON.stringify(settings));
}

/**
 * Get default settings.
 */
export function getDefaultSettings() {
  return {
    threshold: 30,
    countdownDuration: 15,
    autoStart: false,
    emergencyMessage: '🚨 EMERGENCY! I may have been in a road accident. Please call emergency services. My location:',
    emergencyNumber: '112',
    vibrationEnabled: true,
    notificationsEnabled: true
  };
}

/**
 * Merge saved settings with defaults.
 */
export function loadSettings() {
  const defaults = getDefaultSettings();
  const saved = getSettings();
  return { ...defaults, ...saved };
}

/**
 * Build the emergency SMS body.
 */
export function buildEmergencyMessage(position, customMessage, videoLink = null) {
  const settings = loadSettings();
  const msg = customMessage || settings.emergencyMessage;
  let finalMsg = msg;

  if (position) {
    const mapsLink = `https://maps.google.com/maps?q=${position.latitude},${position.longitude}`;
    finalMsg = `${msg}\n📍 Location: ${mapsLink}`;
  } else {
    finalMsg = `${msg}\n📍 Location: Unavailable`;
  }

  if (videoLink) {
    finalMsg += `\n🎬 Watch Video Evidence: ${videoLink}`;
  }

  finalMsg += `\n🕒 Time: ${new Date().toLocaleString()}`;
  return finalMsg;
}

/**
 * Send SMS alerts to all emergency contacts.
 * On Android native: sends SMS directly in background (auto-send, no user action needed).
 * On web/PWA: falls back to sms: URI scheme (opens SMS app).
 */
export async function sendSMSAlerts(position, videoLink = null) {
  const contacts = getContacts();
  if (contacts.length === 0) return false;

  const message = buildEmergencyMessage(position, null, videoLink);

  // --- Native Android: Auto-send via SmsSender plugin ---
  if (isNativeSmAvailable()) {
    const results = [];
    for (const contact of contacts) {
      try {
        await SmsSender.send({ phone: contact.phone, message });
        results.push({ phone: contact.phone, success: true });
      } catch (err) {
        console.error(`Failed to send SMS to ${contact.phone}:`, err);
        results.push({ phone: contact.phone, success: false, error: err.message });
      }
    }
    // Return true if at least one SMS was sent successfully
    return results.some(r => r.success);
  }

  // --- Web fallback: open SMS app with pre-filled message ---
  const phones = contacts.map(c => c.phone).join(',');
  const smsUri = `sms:${phones}?body=${encodeURIComponent(message)}`;
  window.open(smsUri, '_self');
  return true;
}

/**
 * Check SMS permission status (native only).
 */
export async function checkSmsPermission() {
  if (!isNativeSmAvailable()) return { granted: false, native: false };
  try {
    const result = await SmsSender.checkPermission();
    return { granted: result.granted, native: true };
  } catch {
    return { granted: false, native: true };
  }
}

/**
 * Request SMS permission from user (native only).
 */
export async function requestSmsPermission() {
  if (!isNativeSmAvailable()) return { granted: false, native: false };
  try {
    const result = await SmsSender.requestPermission();
    return { granted: result.granted, native: true };
  } catch {
    return { granted: false, native: true };
  }
}

/**
 * Call emergency number (manual — opens dialer on web).
 */
export function callEmergency(number = '112') {
  window.open(`tel:${number}`, '_self');
}

/**
 * Auto-call: silently places a phone call without opening the dialer.
 * On Android native: uses CrashGuard.makeEmergencyCall (Intent.ACTION_CALL).
 * On web: falls back to tel: URI (opens dialer).
 */
export async function autoCallEmergency(number = '112') {
  if (Capacitor.isNativePlatform() && CrashGuard !== null) {
    try {
      const result = await CrashGuard.makeEmergencyCall({ number });
      return { called: true, number: result.number };
    } catch (err) {
      console.error('Auto-call failed:', err);
      window.open(`tel:${number}`, '_self');
      return { called: false, fallback: true, error: err.message };
    }
  }
  // Web fallback
  window.open(`tel:${number}`, '_self');
  return { called: false, fallback: true };
}

/**
 * Sequential auto-call with backup numbers.
 *
 * On NATIVE Android (Capacitor):
 *   - Waits `initialDelaySeconds` before placing the first call (default: 10s).
 *   - Calls each saved contact's primary number one at a time.
 *   - If the contact has a backupPhone, waits `waitSeconds` then calls the backup.
 *   - Continues until all contacts + backups have been tried.
 *
 * On WEB (browser):
 *   - Opens the dialer once for the first primary number after initial delay.
 *
 * @param {number} waitSeconds - Gap between primary and backup call (default 25s)
 * @param {number} initialDelaySeconds - Wait before first call (default 10s)
 */
export async function sequentialAutoCall(waitSeconds = 25, initialDelaySeconds = 10) {
  const contacts = getContacts();
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Wait before placing any call — lets SMS land first
  await delay(initialDelaySeconds * 1000);

  if (!contacts.length) {
    await autoCallEmergency('112');
    return;
  }

  // WEB: Can only open dialer once
  if (!Capacitor.isNativePlatform()) {
    window.open(`tel:${contacts[0].phone}`, '_self');
    return;
  }

  // NATIVE: Sequential calling with backup fallback
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    console.log(`[SOS Call] Calling ${contact.name} (${contact.phone})...`);

    try {
      await CrashGuard.makeEmergencyCall({ number: contact.phone });
    } catch (err) {
      console.warn(`[SOS Call] Failed to call ${contact.phone}:`, err.message);
    }

    if (contact.backupPhone) {
      console.log(`[SOS Call] Waiting ${waitSeconds}s for backup...`);
      await delay(waitSeconds * 1000);
      console.log(`[SOS Call] Calling backup (${contact.backupPhone})...`);
      try {
        await CrashGuard.makeEmergencyCall({ number: contact.backupPhone });
        await delay(waitSeconds * 1000);
      } catch (err) {
        console.warn(`[SOS Call] Backup call failed:`, err.message);
      }
    } else {
      if (i < contacts.length - 1) {
        await delay(waitSeconds * 1000);
      }
    }
  }
}


/**
 * Acknowledge impact to Native Service (Heartbeat).
 */
export async function acknowledgeImpact() {
  if (Capacitor.isNativePlatform() && CrashGuard) {
    try {
      await CrashGuard.acknowledgeImpact();
    } catch (e) {
      console.warn('Failed to acknowledge impact:', e);
    }
  }
}

/**
 * Stop the native failsafe timer (User is safe).
 */
export async function abortFailsafe() {
  if (Capacitor.isNativePlatform() && CrashGuard) {
    try {
      await CrashGuard.abortFailsafe();
    } catch (e) {
      console.warn('Failed to abort failsafe:', e);
    }
  }
}

/**
 * Check if CALL_PHONE permission is granted (native only).
 */
export async function checkCallPermission() {
  if (!Capacitor.isNativePlatform() || !CrashGuard) return { granted: false, native: false };
  try {
    const result = await CrashGuard.checkCallPermission();
    return { granted: result.granted, native: true };
  } catch {
    return { granted: false, native: true };
  }
}

/**
 * Request CALL_PHONE permission from user (native only).
 */
export async function requestCallPermission() {
  if (!Capacitor.isNativePlatform() || !CrashGuard) return { granted: false, native: false };
  try {
    const result = await CrashGuard.requestCallPermission();
    return { granted: result.granted, native: true };
  } catch {
    return { granted: false, native: true };
  }
}

/**
 * Request notification permission and send a browser notification.
 */
export async function sendNotification(title, body) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'accident-alert',
      requireInteraction: true
    });

    return notification;
  }
}

/**
 * Vibrate the device (if supported).
 */
export function vibrateDevice(pattern = [500, 200, 500, 200, 500]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Stop vibration.
 */
export function stopVibration() {
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
}
