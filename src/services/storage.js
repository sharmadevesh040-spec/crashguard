/**
 * Persistent Storage Service (IndexedDB)
 * Stores accident evidence records including video blobs and metadata.
 */

const DB_NAME = 'AccidentGuardMedia';
const STORE_NAME = 'incidents'; // Renamed to plural to indicate multiple records
const DB_VERSION = 2; // Incremented version for new schema

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Save a complete accident record.
 * @param {Object} record - { id, video, photo, metadata, timestamp }
 */
export async function saveIncident(record) {
  const db = await openDB();
  
  // Auto-cleanup before saving new record
  await cleanupOldRecords(db, 20);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all incident records (metadata only for performance).
 */
export async function getAllIncidents() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll(); // In a real app we'd use a projection, but getAll is fine for ~20 items
    request.onsuccess = () => {
      // Sort by timestamp descending (newest first)
      const sorted = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getIncident(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteIncident(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function cleanupOldRecords(db, limit) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result || [];
      if (records.length >= limit) {
        // Sort by timestamp (oldest first)
        records.sort((a, b) => a.timestamp - b.timestamp);
        
        // Delete oldest items to get back to limit-1 (leaving space for the new one)
        const toDeleteCount = (records.length - limit) + 1;
        for (let i = 0; i < toDeleteCount; i++) {
          store.delete(records[i].id);
          console.log('[Storage] Pruned old record:', records[i].id);
        }
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// Deprecated alias for backward compatibility during migration
export const saveMedia = async (id, blob) => {
  console.warn('saveMedia is deprecated, use saveIncident');
  return saveIncident({ id, video: blob, timestamp: Date.now() });
};
export const getMedia = async (id) => {
  const rec = await getIncident(id);
  return rec ? rec.video : null;
};
