-- Run with: supabase test db   (pgTAP). Proves tenant isolation + admin-only RPCs.
begin;
select plan(8);
insert into auth.users(id, email, instance_id, aud, role) values
 ('00000000-0000-0000-0000-0000000000a1','a@t.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000b2','b@t.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('00000000-0000-0000-0000-0000000000c3','admin@t.io','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
update profiles set role='admin', status='ACTIVE' where id='00000000-0000-0000-0000-0000000000c3';
insert into payment_requests(user_id, amount_paise, utr, payer_name) values ('00000000-0000-0000-0000-0000000000b2', 350000, 'UTR12345678', 'B');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from profiles), 1, 'user A sees only own profile');
select is((select count(*)::int from payment_requests), 0, 'user A cannot see B payments');
select throws_ok($$select approve_payment(gen_random_uuid())$$, 'forbidden', 'non-admin cannot approve');
select throws_ok($$select set_user_status('00000000-0000-0000-0000-0000000000b2','ACTIVE')$$, 'forbidden', 'non-admin cannot change status');
update profiles set status='ACTIVE', role='admin' where id='00000000-0000-0000-0000-0000000000a1';
select is((select status::text from profiles where id='00000000-0000-0000-0000-0000000000a1'), 'PENDING', 'user cannot self-activate');
select is((select role::text from profiles where id='00000000-0000-0000-0000-0000000000a1'), 'user', 'user cannot self-promote');
select throws_ok($$insert into payment_requests(user_id, amount_paise, utr, payer_name) values ('00000000-0000-0000-0000-0000000000b2', 1, 'UTR99999999', 'x')$$, '42501', null, 'cannot insert payment for another user');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select is((select count(*)::int from payment_requests), 1, 'admin sees all payments');
select * from finish();
rollback;
