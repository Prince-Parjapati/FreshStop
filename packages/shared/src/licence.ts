export interface LicenceClaims {
  uid: string; plan: string; iat: number; exp: number | null; dev: string;
  graceDays: number; status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED';
}
export type LicenceState = 'OK' | 'WARN' | 'LOCKED_OFFLINE' | 'BLOCKED' | 'EXPIRED' | 'CLOCK_TAMPER';
const DAY = 86400000;
/** Decide app lock state from verified claims + last successful online verification. */
export function licenceState(c: LicenceClaims, now: number, lastVerifiedAt: number, lastSeenMonotonic: number): LicenceState {
  if (now < lastSeenMonotonic - DAY) return 'CLOCK_TAMPER';
  if (c.status === 'BLOCKED') return 'BLOCKED';
  if (c.status === 'EXPIRED' || (c.exp !== null && now > c.exp * 1000)) return 'EXPIRED';
  const age = (now - lastVerifiedAt) / DAY;
  if (age > c.graceDays) return 'LOCKED_OFFLINE';
  if (age > c.graceDays - 4) return 'WARN';
  return 'OK';
}
