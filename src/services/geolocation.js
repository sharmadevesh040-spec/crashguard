/**
 * Geolocation Service
 * Provides continuous GPS tracking and generates emergency links.
 */

export class GeolocationService {
  constructor(options = {}) {
    this.onUpdate = options.onUpdate || (() => {});
    this.onError = options.onError || (() => {});
    this._watchId = null;
    this._lastPosition = null;
  }

  get lastPosition() {
    return this._lastPosition;
  }

  get isTracking() {
    return this._watchId !== null;
  }

  startTracking() {
    if (this._watchId !== null) return;

    if (!('geolocation' in navigator)) {
      this.onError('Geolocation is not supported');
      return false;
    }

    this._watchId = navigator.geolocation.watchPosition(
      (position) => {
        this._lastPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        };
        this.onUpdate(this._lastPosition);
      },
      (error) => {
        let msg = 'Location error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied. Please enable GPS.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out';
            break;
        }
        this.onError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return true;
  }

  stopTracking() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
  }

  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const data = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          };
          this._lastPosition = data;
          resolve(data);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  /**
   * Generate a Google Maps link for the current position.
   */
  getGoogleMapsLink(position = null) {
    const pos = position || this._lastPosition;
    if (!pos) return '';
    return `https://maps.google.com/maps?q=${pos.latitude},${pos.longitude}`;
  }

  /**
   * Calculate distance (in km) between two coordinates using the Haversine formula.
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  destroy() {
    this.stopTracking();
  }
}
