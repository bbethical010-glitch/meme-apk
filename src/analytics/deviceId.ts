import { PROHIBITED_PII_KEYS, ALLOWED_PROPERTY_KEYS } from './analyticsTypes';

export function sanitizeAppVersion(raw?: string | null): string {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return '1.0';
  }
  let replaced = raw.replace(/[^0-9A-Za-z.+_-]/g, '-');
  if (replaced.length > 32) {
    replaced = replaced.substring(0, 32);
  }
  return replaced || '1.0';
}

const STORAGE_INSTALL_ID = 'meme_capsule_install_id';
const STORAGE_USER_HASH = 'meme_capsule_user_hash';

export async function computeSha256(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch {
      // Fall through to JS implementation
    }
  }

  // Pure TypeScript/JS SHA-256 implementation fallback
  return sha256Pure(input);
}

function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * 2; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = [...hash];

    hash = hash.slice(0, 8);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 = i >= 16 ? rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3) : 0;
      const s1 = i >= 16 ? rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10) : 0;
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);

      const temp1 = (hash[7] + s1h + ch + k[i] + w[i]) | 0;
      const temp2 = (s0h + maj) | 0;

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result.toLowerCase();
}

export function getAnonymousInstallId(): string {
  if (typeof localStorage === 'undefined') {
    return '00000000-0000-4000-8000-000000000000';
  }
  let id = localStorage.getItem(STORAGE_INSTALL_ID);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(STORAGE_INSTALL_ID, id);
  }
  return id;
}

export const getDeviceId = getAnonymousInstallId;

export async function getUserHash(): Promise<string> {
  if (typeof localStorage !== 'undefined') {
    const cachedHash = localStorage.getItem(STORAGE_USER_HASH);
    if (cachedHash && cachedHash.length === 64 && /^[0-9a-f]{64}$/.test(cachedHash)) {
      return cachedHash;
    }
  }

  const installId = getAnonymousInstallId();
  const hash = await computeSha256(installId);

  if (typeof localStorage !== 'undefined' && hash && hash.length === 64) {
    localStorage.setItem(STORAGE_USER_HASH, hash);
  }
  return hash;
}

export function sanitizeProperties(props?: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!props || typeof props !== 'object' || Array.isArray(props)) return clean;

  for (const [key, val] of Object.entries(props)) {
    if (!key) continue;
    const lowerKey = key.trim().toLowerCase();
    if (
      PROHIBITED_PII_KEYS.has(lowerKey) ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      (lowerKey.includes('key') && (lowerKey.includes('api') || lowerKey.includes('app')))
    ) {
      continue; // drop PII and secret keys
    }
    if (typeof val === 'string') {
      const lowerVal = val.toLowerCase();
      if (lowerVal.includes('@') && lowerVal.includes('.')) {
        continue; // drop email-like strings
      }
      clean[key] = val;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeProperties(val);
    } else if (Array.isArray(val)) {
      clean[key] = val
        .map((item) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            return sanitizeProperties(item);
          }
          if (typeof item === 'string') {
            const lowerItem = item.toLowerCase();
            return lowerItem.includes('@') && lowerItem.includes('.') ? undefined : item;
          }
          return item;
        })
        .filter((item) => item !== undefined);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export function validateAndSanitizePropertiesBeforeEnqueue(
  props?: Record<string, any>
): { clean: Record<string, any>; droppedCount: number } {
  const clean: Record<string, any> = {};
  let droppedCount = 0;
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    return { clean, droppedCount };
  }

  for (const [key, val] of Object.entries(props)) {
    if (!key) continue;
    const lowerKey = key.trim().toLowerCase();

    // Step 5: Check ONE local allowlist constant
    if (!ALLOWED_PROPERTY_KEYS.has(lowerKey)) {
      droppedCount++;
      continue;
    }

    if (
      PROHIBITED_PII_KEYS.has(lowerKey) ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      (lowerKey.includes('key') && (lowerKey.includes('api') || lowerKey.includes('app')))
    ) {
      droppedCount++;
      continue;
    }

    if (typeof val === 'string') {
      const lowerVal = val.toLowerCase();
      if (lowerVal.includes('@') && lowerVal.includes('.')) {
        droppedCount++;
        continue;
      }
      clean[key] = val.length > 256 ? val.substring(0, 256) : val;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      clean[key] = val;
    } else {
      // Non-scalar (nested object/array) dropped
      droppedCount++;
    }
  }

  return { clean, droppedCount };
}
