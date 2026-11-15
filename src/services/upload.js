/**
 * Light-weight upload service for sharing evidence over SMS.
 * Uses file.io for anonymous, temporary storage (deleted after first view or 14 days).
 */

export async function uploadEvidence(blob, fileName = 'evidence.webm') {
  try {
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('expires', '14d'); // Keep for 14 days or until first download

    const response = await fetch('https://file.io', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');

    const data = await response.json();
    console.log('[Upload] Evidence shared at:', data.link);
    return data.link; // The public URL
  } catch (err) {
    console.error('[Upload] Error sharing evidence:', err);
    return null;
  }
}
