import { View } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { clearLicence } from '../../src/lib/licence';
import { Button, Screen, T } from '../../src/ui/kit';
export default function More() {
  return (
    <Screen style={{ paddingTop: 40, gap: 12 }}>
      <T size="xl" bold>More</T>
      <T muted>Backup, reports, slips and security settings are coming in the next phase.</T>
      <View><Button kind="ghost" label="Logout" onPress={async () => { await clearLicence(); await supabase.auth.signOut(); }} /></View>
    </Screen>
  );
}
