import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Application from 'expo-application';
import { supabase } from '../../src/lib/supabase';
import { clearLicence } from '../../src/lib/licence';
import { publicSettings } from '../../src/lib/shop';
import { useSettings, useT } from '../../src/i18n';
import { Banner, Button, Screen, T } from '../../src/ui/kit';

export default function More() {
  const t = useT(); const r = useRouter(); const { lang, setLang } = useSettings();
  const [wa, setWa] = useState(''); const [upd, setUpd] = useState('');
  useEffect(() => { publicSettings().then((s) => setWa(s.whatsapp ?? '')); }, []);
  const checkUpdate = async () => {
    const { data } = await supabase.from('app_versions').select('*').order('version_code', { ascending: false }).limit(1).maybeSingle();
    const cur = Number(Application.nativeBuildVersion ?? 1);
    if (data && data.version_code > cur) { setUpd(`Update ${data.version_name} available`); Linking.openURL(data.apk_url); } else setUpd('You are up to date');
  };
  const deleteAccount = () => Alert.alert('Delete account?', 'Your licence and account will be removed from our server. Data on this phone stays until you uninstall — export a backup first. No refund.', [
    { text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.rpc('delete_my_account'); await clearLicence(); await supabase.auth.signOut(); } }]);
  const go = (p: string) => () => r.push(p as any);
  return (
    <Screen style={{ paddingTop: 40 }}><ScrollView contentContainerStyle={{ gap: 10 }}>
      <T size="xl" bold>{t('more')}</T>
      <Button kind="ghost" label={t('daybook')} onPress={go('/daybook')} /><Button kind="ghost" label={t('reports')} onPress={go('/reports')} />
      <Button kind="ghost" label={t('items')} onPress={go('/items')} /><Button kind="ghost" label={t('stock')} onPress={go('/stock')} /><Button kind="ghost" label={t('crates')} onPress={go('/crates')} /><Button kind="ghost" label={t('supportTickets')} onPress={go('/support')} />
      <Button kind="ghost" label={t('backup')} onPress={go('/backup')} /><Button kind="ghost" label={t('recycle')} onPress={go('/recycle')} />
      <Button kind="ghost" label={t('shop')} onPress={go('/shop')} /><Button kind="ghost" label={t('security')} onPress={go('/security')} />
      <Button kind="ghost" label={`${t('language')}: ${lang === 'hi' ? 'हिन्दी → English' : 'English → हिन्दी'}`} onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')} />
      <Button kind="ghost" label={t('update')} onPress={checkUpdate} />{!!upd && <Banner text={upd} />}
      {!!wa && <Button kind="ghost" label={t('support')} onPress={() => Linking.openURL(`https://wa.me/${wa}`)} />}
      <Button kind="ghost" label={t('logout')} onPress={async () => { await clearLicence(); await supabase.auth.signOut(); }} />
      <Button kind="danger" label={t('deleteAccount')} onPress={deleteAccount} />
      <T size="xs" muted>Mandi Khata v{Application.nativeApplicationVersion}</T>
    </ScrollView></Screen>
  );
}
