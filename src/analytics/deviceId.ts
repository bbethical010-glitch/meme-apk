export async function getDeviceId(): Promise<string> {
  const STORAGE_KEY = 'meme_capsule_device_id';
  const existingId = localStorage.getItem(STORAGE_KEY);
  if (existingId) return existingId;

  let newId = '';
  try {
    const uuid = crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(uuid);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    newId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback if crypto is unavailable (very old WebViews)
    const chars = '0123456789abcdef';
    for (let i = 0; i < 64; i++) {
      newId += chars[Math.floor(Math.random() * 16)];
    }
  }

  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}
