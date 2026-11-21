import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FS from 'expo-file-system/legacy';
import { useRepo } from '../src/lib/useRepo';
import { decryptBackup, encryptBackup } from '../src/lib/backup';
import { shareText } from '../src/lib/share';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';
import { useT } from '../src/i18n';

export default function Backup() {
  const repo = useRepo(); const t = useT(); const [pw, setPw] = useState(''); const [msg, setMsg] = useState<{ t: string; e?: boolean } | null>(null); const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<string>) => { setBusy(true); try { setMsg({ t: await fn() }); } catch (e: any) { setMsg({ t: e.message, e: true }); } finally { setBusy(false); } };
  const exportIt = () => run(async () => {
    if (pw.length < 6) throw new Error('Password must be at least 6 characters (remember it — it cannot be recovered)');
    const f = `mandikhata-${new Date().toISOString().slice(0, 10)}.mkbackup`;
    await shareText(f, encryptBackup(await repo!.exportAll(), pw), 'application/octet-stream'); return 'Backup created. Save it to Google Drive / WhatsApp.';
  });
  const importIt = () => run(async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }); if (r.canceled) return 'Cancelled';
    const dump = decryptBackup(await FS.readAsStringAsync(r.assets[0]!.uri), pw);
    const ok = await new Promise<boolean>((res) => Alert.alert('Restore?', 'This REPLACES all current data on this phone.', [{ text: 'Cancel', onPress: () => res(false) }, { text: 'Restore', style: 'destructive', onPress: () => res(true) }]));
    if (!ok) return 'Cancelled';
    await repo!.exportAll().then((cur) => shareText('before-restore.mkbackup', encryptBackup(cur, pw), 'application/octet-stream')).catch(() => {});
    await repo!.importAll(dump); return 'Restored successfully.';
  });
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: t('backup') }} />
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <Card style={{ gap: 8 }}><T muted>Backups are encrypted (AES-256) with your password. Keep them on Google Drive or send to yourself on WhatsApp. Your data lives only on this phone — back up regularly.</T>
          <Field label="Backup password" secureTextEntry value={pw} onChangeText={setPw} /></Card>
        {msg && <Banner tone={msg.e ? 'error' : 'warn'} text={msg.t} />}
        <Button label="Create backup & share" onPress={exportIt} loading={busy} disabled={!repo} />
        <Button kind="ghost" label="Restore from backup file" onPress={importIt} disabled={!repo || busy} />
      </ScrollView></Screen>
  );
}
