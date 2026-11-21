import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { Banner, Button, Card, Field, Screen, T } from '../src/ui/kit';
export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]); const [open, setOpen] = useState<string | null>(null); const [thread, setThread] = useState<any[]>([]);
  const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [reply, setReply] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => { const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(30); setTickets(data ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const openT = async (id: string) => { setOpen(id); const { data } = await supabase.from('ticket_messages').select('*, profiles(role)').eq('ticket_id', id).order('created_at'); setThread(data ?? []); };
  const create = async () => {
    setErr(''); if (subject.trim().length < 3 || body.trim().length < 5) return setErr('Please describe your problem');
    const { data: u } = await supabase.auth.getUser();
    const { data: t, error } = await supabase.from('support_tickets').insert({ user_id: u.user!.id, subject: subject.trim() }).select().single();
    if (error) return setErr(error.message);
    await supabase.from('ticket_messages').insert({ ticket_id: t.id, author_id: u.user!.id, body: body.trim() }); setSubject(''); setBody(''); load(); openT(t.id);
  };
  const send = async () => { if (!reply.trim() || !open) return; const { data: u } = await supabase.auth.getUser(); await supabase.from('ticket_messages').insert({ ticket_id: open, author_id: u.user!.id, body: reply.trim() }); setReply(''); openT(open); };
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: 'Help & Tickets' }} /><ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
      {open ? <>
        <Button kind="ghost" label="← All tickets" onPress={() => { setOpen(null); load(); }} />
        {thread.map((m) => <Card key={m.id} style={{ backgroundColor: m.profiles?.role === 'admin' ? '#DCFCE7' : undefined }}><T size="xs" muted>{m.profiles?.role === 'admin' ? 'Support' : 'You'} · {new Date(m.created_at).toLocaleString()}</T><T>{m.body}</T></Card>)}
        <Field label="Reply" value={reply} onChangeText={setReply} multiline /><Button label="Send" onPress={send} />
      </> : <>
        <Card style={{ gap: 8 }}><T bold>New ticket</T><Field label="Subject" value={subject} onChangeText={setSubject} /><Field label="Message" value={body} onChangeText={setBody} multiline />{!!err && <Banner tone="error" text={err} />}<Button label="Submit" onPress={create} /></Card>
        <T size="lg" bold>My tickets</T>{!tickets.length && <T muted>No tickets.</T>}
        {tickets.map((t) => <Card key={t.id} style={{ gap: 4 }}><T bold>{t.subject}</T><T size="xs" muted>{t.status} · {new Date(t.created_at).toLocaleDateString()}</T><View><Button kind="ghost" label="Open" onPress={() => openT(t.id)} /></View></Card>)}
      </>}
    </ScrollView></Screen>
  );
}
