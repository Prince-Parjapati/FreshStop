import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatINR } from '@mandimart/shared';
import { supabase } from '../lib/supabase';
import { Initials, PageHead } from '../lib/ui';

export default function Approvals() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['approvals'], refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_requests').select('*, profiles(full_name,shop_name,phone,city,user_code), plans(price_paise)').in('status', ['SUBMITTED', 'INFO_NEEDED']).order('created_at');
      if (error) throw error; return data as any[];
    },
  });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const done = () => { setSel(new Set()); qc.invalidateQueries({ queryKey: ['approvals'] }); qc.invalidateQueries({ queryKey: ['dash'] }); };
  const approve = useMutation({ mutationFn: async (ids: string[]) => { for (const id of ids) { const { error } = await supabase.rpc('approve_payment', { p_id: id }); if (error) throw error; } }, onSuccess: done });
  const reject = useMutation({ mutationFn: async ({ id, reason }: { id: string; reason: string }) => { const { error } = await supabase.rpc('reject_payment', { p_id: id, p_reason: reason }); if (error) throw error; }, onSuccess: done });
  const proof = async (path: string) => { const { data } = await supabase.storage.from('proofs').createSignedUrl(path, 60); if (data) window.open(data.signedUrl, '_blank'); };
  const dupUtr = new Set(data.map((r) => r.utr.toUpperCase()).filter((u, i, a) => a.indexOf(u) !== i));
  if (isLoading) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl font-bold">Approval queue ({data.length})</h2>
        <button className="btn-primary" disabled={!sel.size || approve.isPending} onClick={() => approve.mutate([...sel])}>Approve selected ({sel.size})</button></div>
      {(approve.error || reject.error) && <p role="alert" className="text-red-600">{String((approve.error || reject.error) as Error)}</p>}
      {!data.length && <p className="card text-center text-slate-500">No pending payments — you're all caught up.</p>}
      {data.map((r) => {
        const mismatch = r.plans?.price_paise && r.plans.price_paise !== r.amount_paise;
        const wa = `https://wa.me/91${r.profiles?.phone}?text=${encodeURIComponent('Your Mandi Khata payment is approved. Please open the app.')}`;
        return (
          <div key={r.id} className="card flex flex-wrap items-start gap-4">
            <Initials name={r.profiles?.shop_name} /><input type="checkbox" className="mt-3 h-5 w-5 accent-[#0F8A4F]" aria-label="Select" checked={sel.has(r.id)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(r.id) : n.delete(r.id); setSel(n); }} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{r.profiles?.shop_name} <span className="font-normal text-slate-500">· {r.profiles?.full_name} · {r.profiles?.user_code}</span></p>
              <p>{r.profiles?.phone} · {r.profiles?.city}</p>
              <p>UTR <b>{r.utr}</b> · {r.method} · payer {r.payer_name} · <b>{formatINR(r.amount_paise)}</b></p>
              {mismatch && <p className="text-amber">⚠ Amount differs from plan price ({formatINR(r.plans.price_paise)})</p>}
              {dupUtr.has(r.utr.toUpperCase()) && <p className="text-red-600">⚠ Duplicate UTR</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {r.proof_path && <button className="btn-ghost" onClick={() => proof(r.proof_path)}>Proof</button>}
              <a className="btn-ghost" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="btn-primary" onClick={() => approve.mutate([r.id])}>Approve</button>
              <button className="btn-danger" onClick={() => { const reason = prompt('Reject reason?'); if (reason) reject.mutate({ id: r.id, reason }); }}>Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
