import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
export default function Support() {
  const qc = useQueryClient(); const [open, setOpen] = useState<any>(null); const [reply, setReply] = useState('');
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], refetchInterval: 20000, queryFn: async () => (await supabase.from('support_tickets').select('*, profiles(shop_name,full_name,phone)').order('created_at', { ascending: false }).limit(100)).data ?? [] });
  const { data: thread = [] } = useQuery({ queryKey: ['thread', open?.id], enabled: !!open, queryFn: async () => (await supabase.from('ticket_messages').select('*').eq('ticket_id', open.id).order('created_at')).data ?? [] });
  const send = useMutation({ mutationFn: async () => { const { data: u } = await supabase.auth.getUser(); const { error } = await supabase.from('ticket_messages').insert({ ticket_id: open.id, author_id: u.user!.id, body: reply }); if (error) throw error; setReply(''); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['thread', open?.id] }) });
  const close = useMutation({ mutationFn: async (t: any) => { await supabase.from('support_tickets').update({ status: t.status === 'open' ? 'closed' : 'open' }).eq('id', t.id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }) });
  return (
    <div className="grid gap-4 lg:grid-cols-2"><div className="space-y-3"><h2 className="text-2xl font-bold">Support</h2>
      {!tickets.length && <p className="card text-slate-500">No tickets.</p>}
      {tickets.map((t: any) => <div key={t.id} className={`card cursor-pointer ${open?.id === t.id ? 'ring-2 ring-brand' : ''}`} onClick={() => setOpen(t)}><b>{t.subject}</b> <span className="text-xs text-slate-500">({t.status})</span><p className="text-sm text-slate-500">{t.profiles?.shop_name} · {t.profiles?.phone}</p></div>)}</div>
      <div className="space-y-3">{open && <><div className="flex items-center justify-between"><h3 className="font-semibold">{open.subject}</h3><button className="btn-ghost" onClick={() => close.mutate(open)}>{open.status === 'open' ? 'Close ticket' : 'Reopen'}</button></div>
        {thread.map((m: any) => <div key={m.id} className="card text-sm"><p className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</p>{m.body}</div>)}
        <textarea className="input py-2" placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} /><button className="btn-primary" disabled={!reply.trim()} onClick={() => send.mutate()}>Send reply</button></>}</div></div>
  );
}
