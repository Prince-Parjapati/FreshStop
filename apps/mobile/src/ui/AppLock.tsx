import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { biometric, checkPin, hasPin } from '../lib/pin';
import { Button, Field, Screen, T } from './kit';

/** Locks on cold start and after 60s in background when a PIN is set. */
export default function AppLock({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState(''); const [err, setErr] = useState('');
  const bgAt = useRef(0);
  useEffect(() => { hasPin().then((h) => { setLocked(h); if (h) biometric().then((ok) => ok && setLocked(false)); }); }, []);
  useEffect(() => {
    const s = AppState.addEventListener('change', async (st) => {
      if (st === 'background') bgAt.current = Date.now();
      else if (st === 'active' && bgAt.current && Date.now() - bgAt.current > 60000 && (await hasPin())) setLocked(true);
    });
    return () => s.remove();
  }, []);
  if (locked === null) return null;
  if (!locked) return <>{children}</>;
  const go = async () => { if (await checkPin(pin)) { setLocked(false); setPin(''); setErr(''); } else setErr('Wrong PIN'); };
  return (
    <Screen style={{ justifyContent: 'center', gap: 12 }}>
      <T size="xl" bold>Mandi Khata</T><T muted>Enter PIN to unlock</T>
      <Field label="PIN" secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={setPin} error={err} />
      <Button label="Unlock" onPress={go} />
      <View><Button kind="ghost" label="Use fingerprint / face" onPress={async () => (await biometric()) && setLocked(false)} /></View>
    </Screen>
  );
}
