import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { hasPin, removePin, setPin } from '../src/lib/pin';
import { useSettings, useT } from '../src/i18n';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';
export default function Security() {
  const t = useT(); const { hide, setHide } = useSettings(); const [has, setHas] = useState(false); const [pin, setP] = useState(''); const [msg, setMsg] = useState('');
  useEffect(() => { hasPin().then(setHas); }, []);
  return (
    <Screen style={{ paddingTop: 40, gap: 12 }}><Stack.Screen options={{ headerShown: true, title: t('security') }} />
      <Card style={{ gap: 8 }}><T bold>App PIN {has ? '(enabled)' : '(off)'}</T>
        <Field label="New PIN (4-6 digits)" secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={setP} />
        <Button label={has ? 'Change PIN' : 'Enable PIN'} onPress={async () => { try { await setPin(pin); setHas(true); setP(''); setMsg('PIN saved. Fingerprint also works if enrolled.'); } catch (e: any) { setMsg(e.message); } }} />
        {has && <Button kind="danger" label="Remove PIN" onPress={async () => { await removePin(); setHas(false); setMsg('PIN removed'); }} />}</Card>
      <Button kind="ghost" label={hide ? 'Show balances on Home' : 'Hide balances on Home'} onPress={() => setHide(!hide)} />
      {!!msg && <Banner text={msg} />}
    </Screen>
  );
}
