-- MandiMart Pro: licensing/admin schema. Customer business data stays on-device.
create extension if not exists pgcrypto;

create type user_status as enum ('PENDING','ACTIVE','BLOCKED','EXPIRED','REJECTED');
create type user_role as enum ('user','admin');
create type pay_method as enum ('UPI','CASH','BANK');
create type pay_status as enum ('SUBMITTED','APPROVED','REJECTED','INFO_NEEDED','REFUNDED');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, shop_name text not null,
  phone text unique, email text, city text, state text,
  language text not null default 'hi',
  user_code text unique not null default ('MM-' || lpad((floor(random()*100000))::int::text, 5, '0')),
  status user_status not null default 'PENDING',
  role user_role not null default 'user',
  referred_by uuid references profiles(id),
  last_seen_at timestamptz, app_version text, platform text,
  device_count int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table plans (
  id uuid primary key default gen_random_uuid(), name text not null,
  price_paise bigint not null check (price_paise >= 0),
  duration_days int, is_active boolean not null default true, features jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into plans(name, price_paise, duration_days) values ('Lifetime', 350000, null);

create table licences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references plans(id), issued_at timestamptz not null default now(),
  expires_at timestamptz, status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED','EXPIRED')),
  max_devices int not null default 1, revoked_reason text, issued_by uuid references profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on licences(user_id);

create table payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references plans(id), amount_paise bigint not null check (amount_paise > 0),
  utr text not null check (utr ~ '^[A-Za-z0-9]{8,30}$'), payer_name text not null,
  method pay_method not null default 'UPI', proof_path text,
  status pay_status not null default 'SUBMITTED',
  reviewed_by uuid references profiles(id), reviewed_at timestamptz, admin_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index payment_utr_unique on payment_requests (upper(utr)) where status <> 'REJECTED';
create index on payment_requests(status, created_at);

create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  device_id_hash text not null, model text, os text,
  first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
  is_active boolean not null default true, unique(user_id, device_id_hash)
);

create table app_versions (
  id uuid primary key default gen_random_uuid(), version_name text not null, version_code int not null unique,
  apk_url text not null, changelog text, mandatory boolean not null default false,
  min_supported_code int not null default 0, published_at timestamptz not null default now()
);
create table announcements (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null,
  type text not null default 'info' check (type in ('info','warning','promo','maintenance')),
  target jsonb not null default '{}', starts_at timestamptz not null default now(), ends_at timestamptz,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table support_tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade,
  subject text not null, status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table ticket_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid not null references profiles(id), body text not null, created_at timestamptz not null default now()
);
create table usage_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  vouchers_count int not null default 0, parties_count int not null default 0, items_count int not null default 0,
  last_backup_at timestamptz, updated_at timestamptz not null default now()
);
create table audit_log (
  id bigint generated always as identity primary key, actor_id uuid, action text not null,
  entity text, entity_id text, meta jsonb not null default '{}', ip text, created_at timestamptz not null default now()
);
create table app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
insert into app_settings(key,value) values
 ('upi_id','"8708502288@upi"'),('upi_name','"Mandi Khata"'),('bank','{}'),('whatsapp','"918708502288"'),('maintenance','false'),
 ('min_version_code','0'),('support_text','""'),('trial_days','0'),('licence_grace_days','14');
create table discount_codes (
  code text primary key, percent int check (percent between 1 and 100), amount_paise bigint,
  max_uses int, used int not null default 0, expires_at timestamptz
);

-- helpers
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function touch_updated() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','plans','licences','payment_requests','support_tickets'] loop
    execute format('create trigger trg_touch before update on %I for each row execute function touch_updated()', t);
  end loop; end $$;

-- users cannot change privileged profile columns
create or replace function guard_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and auth.uid() is not null then
    new.status := old.status; new.role := old.role; new.user_code := old.user_code; new.id := old.id;
    new.device_count := old.device_count;
  end if;
  return new;
end $$;
create trigger trg_guard_profile before update on profiles for each row execute function guard_profile();

-- profile auto-create on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, shop_name, phone, email, city, language)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'shop_name',''),
          nullif(new.raw_user_meta_data->>'phone',''), new.email, new.raw_user_meta_data->>'city',
          coalesce(new.raw_user_meta_data->>'language','hi'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- audit immutability
create or replace function audit_immutable() returns trigger language plpgsql as $$ begin raise exception 'audit_log is append-only'; end $$;
create trigger trg_audit_noupd before update or delete on audit_log for each row execute function audit_immutable();

-- RLS
do $$ declare t text; begin
  foreach t in array array['profiles','plans','licences','payment_requests','devices','app_versions','announcements','support_tickets','ticket_messages','usage_stats','audit_log','app_settings','discount_codes'] loop
    execute format('alter table %I enable row level security', t);
  end loop; end $$;

create policy p_self_select on profiles for select using (id = auth.uid() or is_admin());
create policy p_self_update on profiles for update using (id = auth.uid() or is_admin());
create policy p_admin_all_profiles_del on profiles for delete using (is_admin());

create policy plans_read on plans for select using (is_active or is_admin());
create policy plans_admin on plans for all using (is_admin()) with check (is_admin());

create policy lic_own on licences for select using (user_id = auth.uid() or is_admin());
create policy lic_admin on licences for all using (is_admin()) with check (is_admin());

create policy pay_own_select on payment_requests for select using (user_id = auth.uid() or is_admin());
create policy pay_own_insert on payment_requests for insert with check (
  user_id = auth.uid() and status = 'SUBMITTED'
  and exists (select 1 from profiles p where p.id = auth.uid() and p.status in ('PENDING','REJECTED')));
create policy pay_admin_update on payment_requests for update using (is_admin());

create policy dev_own on devices for select using (user_id = auth.uid() or is_admin());
create policy dev_admin on devices for all using (is_admin()) with check (is_admin());

create policy ver_public on app_versions for select using (true);
create policy ver_admin on app_versions for all using (is_admin()) with check (is_admin());
create policy ann_public on announcements for select using ((is_active and starts_at <= now() and (ends_at is null or ends_at > now())) or is_admin());
create policy ann_admin on announcements for all using (is_admin()) with check (is_admin());

create policy tk_own on support_tickets for select using (user_id = auth.uid() or is_admin());
create policy tk_ins on support_tickets for insert with check (user_id = auth.uid());
create policy tk_admin on support_tickets for update using (is_admin());
create policy tm_sel on ticket_messages for select using (is_admin() or exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid()));
create policy tm_ins on ticket_messages for insert with check (author_id = auth.uid() and (is_admin() or exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid())));

create policy us_own on usage_stats for select using (user_id = auth.uid() or is_admin());
create policy audit_admin_read on audit_log for select using (is_admin());
create policy settings_admin on app_settings for all using (is_admin()) with check (is_admin());
create policy codes_admin on discount_codes for all using (is_admin()) with check (is_admin());

create view public_settings as
  select key, value from app_settings where key in ('upi_id','upi_name','bank','whatsapp','maintenance','min_version_code','support_text','licence_grace_days');
grant select on public_settings to anon, authenticated;

-- Admin RPCs
create or replace function approve_payment(p_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r payment_requests; pl plans;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into r from payment_requests where id = p_id for update;
  if r.id is null or r.status not in ('SUBMITTED','INFO_NEEDED') then raise exception 'not reviewable'; end if;
  select * into pl from plans where id = r.plan_id;
  update payment_requests set status='APPROVED', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=p_note where id=p_id;
  insert into licences(user_id, plan_id, expires_at, issued_by)
    values (r.user_id, r.plan_id, case when pl.duration_days is null then null else now() + make_interval(days => pl.duration_days) end, auth.uid());
  update profiles set status='ACTIVE' where id = r.user_id;
  insert into audit_log(actor_id, action, entity, entity_id, meta) values (auth.uid(),'approve_payment','payment_requests',p_id::text, jsonb_build_object('user',r.user_id,'utr',r.utr));
end $$;

create or replace function reject_payment(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r payment_requests;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into r from payment_requests where id = p_id for update;
  if r.id is null then raise exception 'not found'; end if;
  update payment_requests set status='REJECTED', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=p_reason where id=p_id;
  update profiles set status='REJECTED' where id = r.user_id and status='PENDING';
  insert into audit_log(actor_id, action, entity, entity_id, meta) values (auth.uid(),'reject_payment','payment_requests',p_id::text, jsonb_build_object('reason',p_reason));
end $$;

create or replace function set_user_status(p_user uuid, p_status user_status, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update profiles set status = p_status where id = p_user;
  if p_status = 'BLOCKED' then update licences set status='REVOKED', revoked_reason=p_reason where user_id=p_user and status='ACTIVE'; end if;
  if p_status = 'ACTIVE' then update licences set status='ACTIVE', revoked_reason=null where user_id=p_user and status='REVOKED'; end if;
  insert into audit_log(actor_id, action, entity, entity_id, meta) values (auth.uid(),'set_user_status','profiles',p_user::text, jsonb_build_object('status',p_status,'reason',p_reason));
end $$;

create or replace function admin_dashboard() returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else jsonb_build_object(
    'total_users', (select count(*) from profiles where role='user'),
    'pending_payments', (select count(*) from payment_requests where status='SUBMITTED'),
    'active', (select count(*) from profiles where status='ACTIVE' and role='user'),
    'blocked', (select count(*) from profiles where status='BLOCKED'),
    'revenue_all', (select coalesce(sum(amount_paise),0) from payment_requests where status='APPROVED'),
    'revenue_month', (select coalesce(sum(amount_paise),0) from payment_requests where status='APPROVED' and reviewed_at >= date_trunc('month', now())),
    'signups_30d', (select coalesce(jsonb_agg(jsonb_build_object('d',d,'n',n) order by d),'[]') from (select created_at::date d, count(*) n from profiles where created_at > now()-interval '30 days' group by 1) s),
    'versions', (select coalesce(jsonb_object_agg(coalesce(app_version,'?'), n),'{}') from (select app_version, count(*) n from profiles group by 1) v)
  ) end $$;

-- Client RPCs
create or replace function register_device(p_hash text, p_model text, p_os text, p_version text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim int; cnt int; existing boolean;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select max_devices into lim from licences where user_id=auth.uid() and status='ACTIVE' order by issued_at desc limit 1;
  select exists(select 1 from devices where user_id=auth.uid() and device_id_hash=p_hash) into existing;
  select count(*) into cnt from devices where user_id=auth.uid() and is_active;
  if not existing and lim is not null and cnt >= lim then return jsonb_build_object('ok',false,'reason','DEVICE_LIMIT'); end if;
  insert into devices(user_id, device_id_hash, model, os) values (auth.uid(), p_hash, p_model, p_os)
    on conflict (user_id, device_id_hash) do update set last_seen=now(), is_active=true, model=excluded.model, os=excluded.os;
  update profiles set device_count=(select count(*) from devices where user_id=auth.uid() and is_active), app_version=p_version, last_seen_at=now() where id=auth.uid();
  return jsonb_build_object('ok',true);
end $$;

create or replace function heartbeat(p_version text, p_vouchers int, p_parties int, p_items int, p_backup timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s user_status; m boolean; minv int; latest app_versions;
begin
  update profiles set last_seen_at=now(), app_version=p_version where id=auth.uid() returning status into s;
  insert into usage_stats(user_id, vouchers_count, parties_count, items_count, last_backup_at) values (auth.uid(),p_vouchers,p_parties,p_items,p_backup)
    on conflict (user_id) do update set vouchers_count=excluded.vouchers_count, parties_count=excluded.parties_count, items_count=excluded.items_count, last_backup_at=coalesce(excluded.last_backup_at, usage_stats.last_backup_at), updated_at=now();
  select (value)::text::boolean into m from app_settings where key='maintenance';
  select (value)::text::int into minv from app_settings where key='min_version_code';
  select * into latest from app_versions order by version_code desc limit 1;
  return jsonb_build_object('status', s, 'maintenance', m, 'min_version_code', minv, 'latest', to_jsonb(latest));
end $$;

create or replace function delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin delete from auth.users where id = auth.uid(); end $$;

-- Storage bucket for payment proofs (private)
insert into storage.buckets(id, name, public) values ('proofs','proofs',false) on conflict do nothing;
create policy proofs_own_insert on storage.objects for insert with check (bucket_id='proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy proofs_read on storage.objects for select using (bucket_id='proofs' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- Cleanup jobs (enable pg_cron in dashboard first)
-- select cron.schedule('purge-proofs','0 3 * * *', $$ delete from storage.objects where bucket_id='proofs' and created_at < now()-interval '30 days' $$);
-- select cron.schedule('expire-licences','0 * * * *', $$ update licences set status='EXPIRED' where status='ACTIVE' and expires_at < now() $$);
