import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { registerSchema } from '@mandimart/shared';
import { supabase } from '../src/lib/supabase';
import { Banner, Button, Field, Screen, T } from '../src/ui/kit';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState({ fullName: '', shopName: '', phone: '', email: '', password: '', city: '', language: 'hi' as 'hi' | 'en' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const submit = async () => {
    setMsg(''); setErrs({});
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) setMsg(error.message);
        return;
      }
      const r = registerSchema.safeParse(f);
      if (!r.success) { setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
      const { error } = await supabase.auth.signUp({ email: r.data.email, password: r.data.password, options: { data: { full_name: r.data.fullName, shop_name: r.data.shopName, phone: r.data.phone, city: r.data.city, language: r.data.language } } });
      if (error) setMsg(error.message);
    } finally { setBusy(false); }
  };
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingTop: 48 }} keyboardShouldPersistTaps="handled">
        <T size="xxl" bold>Mandi Khata</T>
        <T muted>{mode === 'login' ? 'Login to continue' : 'Create your shop account'}</T>
        {mode === 'register' && <>
          <Field label="Your name" value={f.fullName} onChangeText={set('fullName')} error={errs.fullName} />
          <Field label="Shop name" value={f.shopName} onChangeText={set('shopName')} error={errs.shopName} />
          <Field label="Mobile" keyboardType="number-pad" maxLength={10} value={f.phone} onChangeText={set('phone')} error={errs.phone} />
          <Field label="City" value={f.city} onChangeText={set('city')} error={errs.city} />
        </>}
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set('email')} error={errs.email} />
        <Field label="Password" secureTextEntry value={f.password} onChangeText={set('password')} error={errs.password} />
        {!!msg && <Banner text={msg} tone="error" />}
        <Button label={mode === 'login' ? 'Login' : 'Register'} onPress={submit} loading={busy} />
        <View><Button kind="ghost" label={mode === 'login' ? 'New here? Register' : 'Have an account? Login'} onPress={() => setMode(mode === 'login' ? 'register' : 'login')} /></View>
      </ScrollView>
    </Screen>
  );
}
