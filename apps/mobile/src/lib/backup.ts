import { gcm } from '@noble/ciphers/aes';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';

const b64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const key = (pw: string, salt: Uint8Array) => pbkdf2(sha256, new TextEncoder().encode(pw), salt, { c: 100_000, dkLen: 32 });

/** AES-256-GCM, PBKDF2 key from user password. Output is a JSON envelope string. */
export function encryptBackup(obj: unknown, password: string): string {
  const salt = randomBytes(16), iv = randomBytes(12);
  const ct = gcm(key(password, salt), iv).encrypt(new TextEncoder().encode(JSON.stringify(obj)));
  return JSON.stringify({ mk: 1, s: b64(salt), i: b64(iv), d: b64(ct) });
}
export function decryptBackup(text: string, password: string): any {
  const e = JSON.parse(text);
  if (e.mk !== 1) throw new Error('Not a Mandi Khata backup');
  try { return JSON.parse(new TextDecoder().decode(gcm(key(password, unb64(e.s)), unb64(e.i)).decrypt(unb64(e.d)))); }
  catch { throw new Error('Wrong password or corrupt file'); }
}
