import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { licenceState, type LicenceClaims, type LicenceState } from '@mandimart/shared';
import { supabase } from './supabase';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
const PUB = process.env.EXPO_PUBLIC_LICENCE_PUBLIC_KEY ?? '';
const K = { token: 'lic_token', verified: 'lic_verified_at', seen: 'lic_last_seen', dev: 'device_uuid' };

const unb64 = (s: string) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
const hex = (u: Uint8Array) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');

export async function deviceHash(): Promise<string> {
  let id = await SecureStore.getItemAsync(K.dev);
  if (!id) { id = Crypto.randomUUID(); await SecureStore.setItemAsync(K.dev, id); }
  const android = Platform.OS === 'android' ? Application.getAndroidId() : '';
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, id + '|' + android);
}

/** Verify signature locally; returns claims or null. */
export function verifyToken(token: string, pubHex = PUB): LicenceClaims | null {
  try {
    const [p, s] = token.split('.');
    if (!p || !s || !pubHex) return null;
    const ok = ed.verify(unb64(s), new TextEncoder().encode(p), Uint8Array.from(pubHex.match(/../g)!.map((h) => parseInt(h, 16))));
    return ok ? (JSON.parse(new TextDecoder().decode(unb64(p))) as LicenceClaims) : null;
  } catch { return null; }
}

export type Gate = { kind: 'NO_LICENCE'; serverStatus?: string } | { kind: LicenceState; claims: LicenceClaims; daysLeft: number };

/** Refresh from server if online; otherwise evaluate the cached token. */
export async function checkLicence(): Promise<Gate> {
  const dev = await deviceHash();
  const now = Date.now();
  try {
    await supabase.rpc('register_device', { p_hash: dev, p_model: Platform.OS, p_os: String(Platform.Version), p_version: Application.nativeApplicationVersion ?? '1.0.0' });
    const { data, error } = await supabase.functions.invoke('get-licence', { body: { deviceHash: dev } });
    if (!error && data) {
      if (data.token && verifyToken(data.token)) {
        await SecureStore.setItemAsync(K.token, data.token);
        await SecureStore.setItemAsync(K.verified, String(now));
      } else if (data.status && data.status !== 'ACTIVE') {
        if (data.status === 'BLOCKED' || data.status === 'EXPIRED') { /* fall through to cached claims with server status */ }
        else return { kind: 'NO_LICENCE', serverStatus: data.status };
      }
    }
  } catch { /* offline: use cache */ }
  const token = await SecureStore.getItemAsync(K.token);
  const claims = token ? verifyToken(token) : null;
  if (!claims || claims.dev !== dev) return { kind: 'NO_LICENCE' };
  const verified = Number(await SecureStore.getItemAsync(K.verified)) || 0;
  const seen = Number(await SecureStore.getItemAsync(K.seen)) || 0;
  const st = licenceState(claims, now, verified, seen);
  if (st !== 'CLOCK_TAMPER') await SecureStore.setItemAsync(K.seen, String(Math.max(seen, now)));
  return { kind: st, claims, daysLeft: Math.max(0, Math.ceil(claims.graceDays - (now - verified) / 86400000)) };
}
export const clearLicence = async () => { for (const k of [K.token, K.verified]) await SecureStore.deleteItemAsync(k); };
