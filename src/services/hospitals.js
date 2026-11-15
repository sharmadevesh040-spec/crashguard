/**
 * Hospital Search Service
 * Uses Overpass API to find nearby hospitals from OpenStreetMap data.
 */

import { GeolocationService } from './geolocation';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// In-memory cache
let _cachedResults = null;
let _cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Search for hospitals near a given latitude/longitude.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in km (default: 10)
 * @returns {Promise<Array>} - Array of hospital objects
 */
export async function searchNearbyHospitals(lat, lng, radiusKm = 10) {
  // Return cached results if fresh enough
  const now = Date.now();
  if (_cachedResults && (now - _cacheTimestamp) < CACHE_DURATION) {
    return _cachedResults;
  }

  const radiusMeters = radiusKm * 1000;

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      relation["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
    );
    out center body;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    const hospitals = data.elements
      .map((el) => {
        const hospLat = el.lat || (el.center && el.center.lat);
        const hospLng = el.lon || (el.center && el.center.lon);

        if (!hospLat || !hospLng) return null;

        const tags = el.tags || {};
        const distance = GeolocationService.calculateDistance(lat, lng, hospLat, hospLng);

        return {
          id: el.id,
          name: tags.name || 'Hospital',
          lat: hospLat,
          lng: hospLng,
          distance: parseFloat(distance.toFixed(2)),
          phone: tags.phone || tags['contact:phone'] || null,
          address: buildAddress(tags),
          emergency: tags.emergency === 'yes',
          website: tags.website || null,
          beds: tags.beds ? parseInt(tags.beds) : null,
          operator: tags.operator || null
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    _cachedResults = hospitals;
    _cacheTimestamp = now;

    return hospitals;
  } catch (error) {
    console.error('Hospital search failed:', error);
    throw error;
  }
}

/**
 * Build a readable address from OSM tags.
 */
function buildAddress(tags) {
  const parts = [];
  if (tags['addr:street']) {
    let street = tags['addr:street'];
    if (tags['addr:housenumber']) street = `${tags['addr:housenumber']} ${street}`;
    parts.push(street);
  }
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

  return parts.length > 0 ? parts.join(', ') : (tags['addr:full'] || '');
}

/**
 * Clear the hospital cache.
 */
export function clearCache() {
  _cachedResults = null;
  _cacheTimestamp = 0;
}

/**
 * Get directions URL (Google Maps).
 */
export function getDirectionsUrl(fromLat, fromLng, toLat, toLng) {
  return `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`;
}
