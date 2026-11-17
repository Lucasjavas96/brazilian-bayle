begin;
create table brb_private.ticket_payment_methods(
 request_id uuid primary key references brb_private.ticket_payments(request_id),
 method text not null check(method in ('pix','card')),
 fingerprint text
);
alter table brb_private.ticket_payment_methods enable row level security;
revoke all on brb_private.ticket_payment_methods from public,anon,authenticated;
create function public.brb_ticket_reserve_method(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; rid uuid := (payload->>'id')::uuid; previous brb_private.ticket_payment_methods; existing boolean;
begin
 perform 1 from brb_private.ticket_requests where id=rid for update;
 select exists(select 1 from brb_private.ticket_payments where request_id=rid) into existing;
 result := public.brb_ticket_service('reserve',payload);
 insert into brb_private.ticket_payment_methods values(rid,case when existing then 'pix' else payload->>'method' end,case when not existing then payload->>'fingerprint' end)
 on conflict do nothing;
 select * into previous from brb_private.ticket_payment_methods where request_id=rid;
 if previous.method is distinct from payload->>'method' or
    (previous.fingerprint is distinct from payload->>'fingerprint' and result#>>'{payment,provider_id}' is null) then
  raise exception 'Meio de pagamento divergente';
 end if;
 return result;
end $$;
revoke all on function public.brb_ticket_reserve_method(jsonb) from public,anon,authenticated;
grant execute on function public.brb_ticket_reserve_method(jsonb) to service_role;
commit;
