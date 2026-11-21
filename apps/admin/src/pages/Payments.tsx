import { useQuery } from '@tanstack/react-query';
import { formatINR } from '@mandimart/shared';
import { supabase, csv } from '../lib/supabase';
export default function Payments() {
  const { data = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: async () => { const { data, error } = await supabase.from('payment_requests').select('*, profiles(shop_name,user_code)').order('created_at', { ascending: false }).limit(500); if (error) throw error; return data as any[]; } });
  return (
    <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Payments</h2>
      <button className="btn-ghost" onClick={() => csv(data.map((r) => ({ date: r.created_at, shop: r.profiles?.shop_name, code: r.profiles?.user_code, utr: r.utr, method: r.method, amount: r.amount_paise / 100, status: r.status })), 'payments')}>Export CSV</button></div>
      <div className="card overflow-x-auto p-0">{isLoading ? <p className="p-4">Loading…</p> : (
        <table className="w-full"><thead><tr>{['Date', 'Shop', 'UTR', 'Method', 'Amount', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{data.map((r) => <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800"><td className="td">{new Date(r.created_at).toLocaleString()}</td><td className="td">{r.profiles?.shop_name}</td><td className="td">{r.utr}</td><td className="td">{r.method}</td><td className="td">{formatINR(r.amount_paise)}</td><td className="td">{r.status}</td></tr>)}</tbody></table>)}</div></div>
  );
}
