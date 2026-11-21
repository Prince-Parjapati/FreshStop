import { View } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { checkLicence } from '../src/lib/licence';
import { useApp } from '../src/lib/store';
import { Button, Screen, T } from '../src/ui/kit';
const MSG: Record<string, string> = {
  BLOCKED: 'Your account is blocked. Contact support.', EXPIRED: 'Your licence has expired.',
  LOCKED_OFFLINE: 'Please connect to the internet to verify your licence.', CLOCK_TAMPER: 'Device date looks wrong. Connect to the internet to continue.',
};
export default function Locked() {
  const { gate, setGate } = useApp();
  return (
    <Screen top style={{ justifyContent: 'center', gap: 16 }}>
      <T size="xl" bold>App locked</T><T muted>{MSG[gate?.kind ?? ''] ?? 'Verification needed.'}</T>
      <Button label="Retry" onPress={async () => setGate(await checkLicence())} />
      <Button kind="ghost" label="Export my data (coming soon)" onPress={() => {}} disabled />
      <View><Button kind="ghost" label="Logout" onPress={() => supabase.auth.signOut()} /></View>
    </Screen>
  );
}
