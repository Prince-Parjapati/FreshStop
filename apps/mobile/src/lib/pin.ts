import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuth from 'expo-local-authentication';
const salted = (pin: string, salt: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + pin);
export const hasPin = async () => !!(await SecureStore.getItemAsync('pin_hash'));
export async function setPin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must be 4-6 digits');
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync('pin_salt', salt); await SecureStore.setItemAsync('pin_hash', await salted(pin, salt));
}
export async function checkPin(pin: string) {
  const [h, s] = await Promise.all([SecureStore.getItemAsync('pin_hash'), SecureStore.getItemAsync('pin_salt')]);
  return !!h && !!s && (await salted(pin, s)) === h;
}
export const removePin = async () => { await SecureStore.deleteItemAsync('pin_hash'); await SecureStore.deleteItemAsync('pin_salt'); };
export const biometric = async () => (await LocalAuth.hasHardwareAsync()) && (await LocalAuth.isEnrolledAsync())
  ? (await LocalAuth.authenticateAsync({ promptMessage: 'Unlock Mandi Khata' })).success : false;
