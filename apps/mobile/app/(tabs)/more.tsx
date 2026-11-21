import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { supabase } from '../../src/lib/supabase';
import { clearLicence } from '../../src/lib/licence';
import { publicSettings } from '../../src/lib/shop';
import { useSettings, useT } from '../../src/i18n';
import { useTheme } from '../../src/ui/theme';
import { Banner, Card, IconBadge, Screen, T } from '../../src/ui/kit';
import { Pressable } from 'react-native';

type I = keyof typeof Ionicons.glyphMap;
export default function More() {
  const t = useT(); const r = useRouter(); const { lang, setLang } = useSettings(); const { c } = useTheme();
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
  const item = (icon: I, tint: string, label: string, onPress: () => void, last = false, danger = false) => (
    <Pressable key={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, opacity: pressed ? 0.7 : 1 })}>
      <IconBadge name={icon} color={tint} size={40} /><Text style={{ flex: 1, color: danger ? c.danger : c.text, fontSize: 16, fontWeight: '600' }}>{label}</Text><Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Pressable>);
  const group = (title: string, rows: React.ReactNode[]) => <View style={{ gap: 8 }}><Text style={{ color: c.muted, fontWeight: '700', fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 4 }}>{title}</Text><Card style={{ paddingVertical: 4 }}>{rows}</Card></View>;
  return (
    <Screen top><ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <T size="xxl" bold>{t('more')}</T>
      {group('Transactions', [item('cart', c.primary, 'Sales / बिक्री', go('/list/sales')), item('basket', c.purple, 'Purchases / खरीद', go('/list/purchases')), item('arrow-down-circle', c.sky, 'Receipts / जमा', go('/list/receipts')), item('arrow-up-circle', c.accent, 'Payments / भुगतान', go('/list/payments'), true)])}
      {group('Books', [item('book', c.primary, t('daybook'), go('/daybook')), item('time', c.danger, 'Outstanding (aging)', go('/outstanding')), item('stats-chart', c.sky, t('reports'), go('/reports'), true)])}
      {group('Stock & masters', [item('leaf', c.purple, t('items'), go('/items')), item('cube', c.accent, t('stock'), go('/stock')), item('file-tray-stacked', c.sky, t('crates'), go('/crates'), true)])}
      {group('Data & security', [item('cloud-upload', c.primary, t('backup'), go('/backup')), item('trash', c.danger, t('recycle'), go('/recycle')), item('storefront', c.purple, t('shop'), go('/shop')), item('lock-closed', c.sky, t('security'), go('/security'), true)])}
      {group('Help & account', [
        item('language', c.primary, `${t('language')}: ${lang === 'hi' ? 'हिन्दी → English' : 'English → हिन्दी'}`, () => setLang(lang === 'hi' ? 'en' : 'hi')),
        item('chatbubbles', c.sky, t('supportTickets'), go('/support')), ...(wa ? [item('logo-whatsapp', '#25D366', t('support'), () => Linking.openURL(`https://wa.me/${wa}`))] : []),
        item('download', c.purple, t('update'), checkUpdate), item('log-out', c.muted, t('logout'), async () => { await clearLicence(); await supabase.auth.signOut(); }),
        item('person-remove', c.danger, t('deleteAccount'), deleteAccount, true, true)])}
      {!!upd && <Banner text={upd} />}
      <T size="xs" muted center>Mandi Khata v{Application.nativeApplicationVersion}</T>
    </ScrollView></Screen>
  );
}
