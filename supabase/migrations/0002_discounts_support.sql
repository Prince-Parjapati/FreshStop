-- Discount codes enforced server-side + payment amount validation.
alter table payment_requests add column if not exists discount_code text;

create or replace function quote_price(p_code text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pl plans; dc discount_codes; amt bigint;
begin
  select * into pl from plans where is_active order by created_at desc limit 1;
  if pl.id is null then return jsonb_build_object('ok', false, 'reason', 'NO_PLAN'); end if;
  amt := pl.price_paise;
  if p_code is not null and length(trim(p_code)) > 0 then
    select * into dc from discount_codes where upper(code) = upper(trim(p_code));
    if dc.code is null or (dc.expires_at is not null and dc.expires_at < now()) or (dc.max_uses is not null and dc.used >= dc.max_uses) then
      return jsonb_build_object('ok', false, 'reason', 'INVALID_CODE', 'amount_paise', pl.price_paise, 'plan_id', pl.id);
    end if;
    if dc.percent is not null then amt := amt - (amt * dc.percent / 100); end if;
    if dc.amount_paise is not null then amt := amt - dc.amount_paise; end if;
    amt := greatest(amt, 100);
  end if;
  return jsonb_build_object('ok', true, 'amount_paise', amt, 'plan_id', pl.id);
end $$;
grant execute on function quote_price(text) to authenticated;

create or replace function validate_payment_amount() returns trigger language plpgsql security definer set search_path = public as $$
declare q jsonb;
begin
  if is_admin() then return new; end if;
  q := quote_price(new.discount_code);
  if (q->>'ok')::boolean is not true then raise exception 'invalid discount code'; end if;
  if new.amount_paise <> (q->>'amount_paise')::bigint then raise exception 'amount mismatch'; end if;
  new.plan_id := (q->>'plan_id')::uuid;
  return new;
end $$;
drop trigger if exists trg_validate_payment on payment_requests;
create trigger trg_validate_payment before insert on payment_requests for each row execute function validate_payment_amount();

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
  if r.discount_code is not null then update discount_codes set used = used + 1 where upper(code) = upper(r.discount_code); end if;
  insert into audit_log(actor_id, action, entity, entity_id, meta) values (auth.uid(),'approve_payment','payment_requests',p_id::text, jsonb_build_object('user',r.user_id,'utr',r.utr,'amount',r.amount_paise));
end $$;

-- Tickets: allow users to close own, admin replies bump status
create policy tk_own_update on support_tickets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
