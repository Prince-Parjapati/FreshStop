# Deploy (₹0)
1. Create Supabase project → SQL editor: run `supabase/migrations/0001_licensing.sql`. Enable `pg_cron`, then run the commented cron lines.
2. Generate licence keypair: `node -e "const n=require('tweetnacl');const k=n.sign.keyPair();console.log('PRIV(seed)',Buffer.from(k.secretKey.slice(0,32)).toString('base64'));console.log('PUB(hex)',Buffer.from(k.publicKey).toString('hex'))"`
3. `supabase functions deploy get-licence` · `supabase secrets set LICENCE_PRIVATE_KEY=<seed b64>`
4. Create your admin user (Auth → Add user), then: `update profiles set role='admin', status='ACTIVE' where email='you@x.com';`
5. Admin web: deploy `apps/admin` (build: `npm run build -w @mandimart/admin`, output `dist`) to Cloudflare Pages/Vercel with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
6. GitHub secrets: SUPABASE_URL, SUPABASE_ANON_KEY, LICENCE_PUBLIC_KEY, ANDROID_KEYSTORE_B64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD. Tag `v1.0.0` → APK on Releases → add the row in Admin → Releases.
7. Admin → Settings: set UPI ID, WhatsApp, price.
Note: client-side licensing deters casual sharing; it can't be fully crack-proof.
