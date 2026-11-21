// Deno Edge Function: returns Ed25519-signed licence token for the caller + device.
// Secrets: LICENCE_PRIVATE_KEY (base64 32-byte seed), SUPABASE_URL, SUPABASE_ANON_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (o: unknown) => b64(new TextEncoder().encode(JSON.stringify(o)));
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey' };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return json({ error: 'unauthorized' }, 401);
  const { deviceHash } = await req.json().catch(() => ({}));
  if (!deviceHash || typeof deviceHash !== 'string') return json({ error: 'bad request' }, 400);

  const { data: prof } = await sb.from('profiles').select('status').eq('id', u.user.id).single();
  const { data: lic } = await sb.from('licences').select('*, plans(name)').eq('user_id', u.user.id).order('issued_at', { ascending: false }).limit(1).maybeSingle();
  const { data: dev } = await sb.from('devices').select('is_active').eq('user_id', u.user.id).eq('device_id_hash', deviceHash).maybeSingle();
  const { data: gs } = await sb.from('public_settings').select('value').eq('key', 'licence_grace_days').maybeSingle();

  // Free trial: started once per account/device by the start_trial RPC.
  const { data: tr } = await sb.rpc('start_trial', { p_hash: deviceHash });
  const trialEnds: string | null = tr?.trial_ends_at ?? null;
  const trialLive = !!trialEnds && new Date(trialEnds) > new Date();

  let status: 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'EXPIRED' | 'NONE' = 'NONE';
  if (prof?.status === 'BLOCKED' || lic?.status === 'REVOKED') status = 'BLOCKED';
  else if (lic?.status === 'EXPIRED' || (lic?.expires_at && new Date(lic.expires_at) < new Date())) status = 'EXPIRED';
  else if (lic && prof?.status === 'ACTIVE' && dev?.is_active) status = 'ACTIVE';
  else if (!lic && prof?.status !== 'ACTIVE' && trialLive && dev?.is_active) status = 'TRIAL';
  if (status === 'NONE') return json({ status: prof?.status ?? 'PENDING', trial_ended: !!trialEnds && !trialLive, trial_ends_at: trialEnds });

  const claims = {
    uid: u.user.id, plan: status === 'TRIAL' ? 'Free trial' : (lic?.plans?.name ?? 'Lifetime'), iat: Math.floor(Date.now() / 1000),
    exp: status === 'TRIAL' ? Math.floor(new Date(trialEnds!).getTime() / 1000) : lic?.expires_at ? Math.floor(new Date(lic.expires_at).getTime() / 1000) : null,
    dev: deviceHash, graceDays: Number(gs?.value ?? 14), status,
  };
  const seed = Uint8Array.from(atob(Deno.env.get('LICENCE_PRIVATE_KEY')!), (c) => c.charCodeAt(0));
  const kp = nacl.sign.keyPair.fromSeed(seed);
  const payload = enc(claims);
  const sig = b64(nacl.sign.detached(new TextEncoder().encode(payload), kp.secretKey));
  return json({ status, token: `${payload}.${sig}` });
});
