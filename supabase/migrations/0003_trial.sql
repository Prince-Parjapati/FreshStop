-- 3-day free trial + richer customer monitoring. Additive & idempotent.
alter table profiles add column if not exists trial_started_at timestamptz;
alter table profiles add column if not exists trial_ends_at timestamptz;
alter table usage_stats add column if not exists sessions int not null default 0;
alter table usage_stats add column if not exists first_active_at timestamptz;
alter table devices add column if not exists app_version text;

-- one trial per physical device (survives account deletion / re-registration)
create table if not exists trial_devices (
  device_id_hash text primary key,
  user_id uuid references profiles(id) on delete set null,
  started_at timestamptz not null default now()
);
create table if not exists usage_days (
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null, opens int not null default 1,
  primary key (user_id, day)
);
alter table trial_devices enable row level security;
alter table usage_days enable row level security;
drop policy if exists trial_devices_admin on trial_devices;
create policy trial_devices_admin on trial_devices for select using (is_admin());
drop policy if exists usage_days_read on usage_days;
create policy usage_days_read on usage_days for select using (user_id = auth.uid() or is_admin());

update app_settings set value = '3', updated_at = now() where key = 'trial_days' and value in ('0','"0"');
insert into app_settings(key, value) values ('trial_days', '3') on conflict (key) do nothing;
create or replace view public_settings as
  select key, value from app_settings where key in ('upi_id','upi_name','bank','whatsapp','maintenance','min_version_code','support_text','licence_grace_days','trial_days');
grant select on public_settings to anon, authenticated;

-- customers can never edit their own trial dates (only trusted RPCs / admins)
create or replace function guard_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() and auth.uid() is not null then
    new.status := old.status; new.role := old.role; new.user_code := old.user_code; new.id := old.id;
    new.device_count := old.device_count;
    if coalesce(current_setting('app.trusted', true), '') <> '1' then
      new.trial_started_at := old.trial_started_at; new.trial_ends_at := old.trial_ends_at;
    end if;
  end if;
  return new;
end $$;

-- Starts the trial on first call (idempotent). A device that already used a trial gets none.
create or replace function start_trial(p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d int; p profiles; used boolean;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select * into p from profiles where id = auth.uid();
  if p.id is null then raise exception 'no profile'; end if;
  if p.trial_ends_at is not null then return jsonb_build_object('trial_ends_at', p.trial_ends_at, 'trial_started_at', p.trial_started_at); end if;
  select coalesce(nullif(trim(both '"' from value::text), '')::int, 0) into d from app_settings where key = 'trial_days';
  d := coalesce(d, 0);
  perform set_config('app.trusted', '1', true);
  if d <= 0 then return jsonb_build_object('trial_ends_at', null); end if;
  select exists(select 1 from trial_devices where device_id_hash = p_hash and user_id is distinct from auth.uid()) into used;
  if used then
    update profiles set trial_started_at = now(), trial_ends_at = now() where id = auth.uid();
    insert into audit_log(actor_id, action, entity, entity_id, meta) values (auth.uid(), 'trial_denied_device', 'profiles', auth.uid()::text, jsonb_build_object('device', left(p_hash, 12)));
    return jsonb_build_object('trial_ends_at', now(), 'denied', true);
  end if;
  insert into trial_devices(device_id_hash, user_id) values (p_hash, auth.uid()) on conflict do nothing;
  update profiles set trial_started_at = now(), trial_ends_at = now() + make_interval(days => d) where id = auth.uid();
  insert into audit_log(actor_id, action, entity, entity_id, meta) values (auth.uid(), 'trial_started', 'profiles', auth.uid()::text, jsonb_build_object('days', d));
  select * into p from profiles where id = auth.uid();
  return jsonb_build_object('trial_ends_at', p.trial_ends_at, 'trial_started_at', p.trial_started_at);
end $$;

-- heartbeat now also counts sessions and active days
create or replace function heartbeat(p_version text, p_vouchers int, p_parties int, p_items int, p_backup timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s user_status; m boolean; minv int; latest app_versions;
begin
  update profiles set last_seen_at = now(), app_version = p_version where id = auth.uid() returning status into s;
  insert into usage_stats(user_id, vouchers_count, parties_count, items_count, last_backup_at, sessions, first_active_at)
    values (auth.uid(), p_vouchers, p_parties, p_items, p_backup, 1, now())
    on conflict (user_id) do update set vouchers_count = excluded.vouchers_count, parties_count = excluded.parties_count, items_count = excluded.items_count,
      last_backup_at = coalesce(excluded.last_backup_at, usage_stats.last_backup_at), sessions = usage_stats.sessions + 1, updated_at = now();
  insert into usage_days(user_id, day) values (auth.uid(), (now() at time zone 'Asia/Kolkata')::date)
    on conflict (user_id, day) do update set opens = usage_days.opens + 1;
  select (value)::text::boolean into m from app_settings where key = 'maintenance';
  select (value)::text::int into minv from app_settings where key = 'min_version_code';
  select * into latest from app_versions order by version_code desc limit 1;
  return jsonb_build_object('status', s, 'maintenance', m, 'min_version_code', minv, 'latest', to_jsonb(latest));
end $$;

-- dashboard numbers incl. trial funnel
create or replace function admin_dashboard() returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else jsonb_build_object(
    'total_users', (select count(*) from profiles where role='user'),
    'pending_payments', (select count(*) from payment_requests where status='SUBMITTED'),
    'active', (select count(*) from profiles where status='ACTIVE' and role='user'),
    'blocked', (select count(*) from profiles where status='BLOCKED'),
    'revenue_all', (select coalesce(sum(amount_paise),0) from payment_requests where status='APPROVED'),
    'revenue_month', (select coalesce(sum(amount_paise),0) from payment_requests where status='APPROVED' and reviewed_at >= date_trunc('month', now())),
    'signups_30d', (select coalesce(jsonb_agg(jsonb_build_object('d',d,'n',n) order by d),'[]') from (select created_at::date d, count(*) n from profiles where created_at > now()-interval '30 days' group by 1) s),
    'versions', (select coalesce(jsonb_object_agg(coalesce(app_version,'?'), n),'{}') from (select app_version, count(*) n from profiles group by 1) v),
    'in_trial', (select count(*) from profiles where role='user' and status <> 'ACTIVE' and status <> 'BLOCKED' and trial_ends_at > now()),
    'trial_expiring', (select count(*) from profiles where role='user' and status <> 'ACTIVE' and status <> 'BLOCKED' and trial_ends_at > now() and trial_ends_at < now() + interval '1 day'),
    'trial_ended_unpaid', (select count(*) from profiles where role='user' and status <> 'ACTIVE' and status <> 'BLOCKED' and trial_ends_at <= now()),
    'converted', (select count(*) from profiles where role='user' and status='ACTIVE' and trial_started_at is not null),
    'active_today', (select count(*) from profiles where role='user' and last_seen_at >= now() - interval '1 day'),
    'active_7d', (select count(*) from profiles where role='user' and last_seen_at >= now() - interval '7 days')
  ) end $$;

-- live updates for the admin dashboard
do $$ begin
  begin alter publication supabase_realtime add table payment_requests; exception when others then null; end;
  begin alter publication supabase_realtime add table profiles; exception when others then null; end;
  begin alter publication supabase_realtime add table support_tickets; exception when others then null; end;
end $$;
