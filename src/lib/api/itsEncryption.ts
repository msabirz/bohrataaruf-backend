import crypto from 'crypto';

// Reversible storage for the ITS number a user typed at verification-submit
// time, so an admin volunteer can visually cross-check it against the
// number printed on their uploaded ITS card photo. This is deliberately a
// SEPARATE mechanism from users.itsNumberHash (login/dedup lookup, one-way
// HMAC, never reversible) — a different key here means compromising one
// secret doesn't help decrypt or forge the other.
//
// AES-256-GCM: authenticated encryption, so a tampered ciphertext fails to
// decrypt rather than silently returning garbage. A DB dump alone is not
// enough to recover the plaintext — the key lives only in env, never in
// the database.
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV, the recommended size for GCM

function getKey(): Buffer {
  const raw = process.env.ITS_NUMBER_ENCRYPTION_KEY;
  if (!raw) throw new Error('ITS_NUMBER_ENCRYPTION_KEY environment variable is missing');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('ITS_NUMBER_ENCRYPTION_KEY must be 64 hex characters (32 bytes) — generate with `openssl rand -hex 32`');
  }
  return key;
}

/** Encrypts a plaintext ITS number for storage. Stored format: "<ivHex>:<authTagHex>:<ciphertextHex>". */
export function encryptItsNumber(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a stored ITS number for admin display. Never call this from
 * anything but a server-side, admin-authenticated context (e.g. the
 * verifications review page) — the whole point is that this value is
 * normally at rest, encrypted, and only surfaced to a logged-in volunteer.
 */
export function decryptItsNumber(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) return null;
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    console.error('[itsEncryption] Failed to decrypt ITS number:', e);
    return null;
  }
}
