/**
 * Convert a Blob to a Base64 string.
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Trigger native gallery save for a video blob.
 */
import { registerPlugin } from '@capacitor/core';
const CrashGuard = registerPlugin('CrashGuard');

export async function exportVideoToGallery(blob, fileName) {
  try {
    const base64 = await blobToBase64(blob);
    await CrashGuard.saveVideoToGallery({ data: base64, fileName });
    return { success: true };
  } catch (err) {
    console.error('Failed to export video:', err);
    return { success: false, error: err };
  }
}

export async function exportPhotoToGallery(dataUrl, fileName) {
  try {
    await CrashGuard.savePhotoToGallery({ data: dataUrl, fileName });
    return { success: true };
  } catch (err) {
    console.error('Failed to export photo:', err);
    return { success: false, error: err };
  }
}
