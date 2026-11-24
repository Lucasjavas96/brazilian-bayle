begin;

create function brb_private.reject_expired_ticket_payment() returns trigger
language plpgsql set search_path='' as $$
begin
  if exists (
    select 1 from brb_private.ticket_requests r
    where r.id = new.request_id and r.created_at + interval '10 minutes' <= now()
  ) then
    raise exception 'O prazo desta reserva expirou.';
  end if;
  return new;
end $$;

create trigger reject_expired_ticket_payment
before insert on brb_private.ticket_payments
for each row execute function brb_private.reject_expired_ticket_payment();

create function brb_private.maintain_ticket_requests() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  expired record;
begin
  for expired in
    select r.id, r.listing_id from brb_private.ticket_requests r
    where r.status = 'solicitada' and r.created_at <= now() - interval '10 minutes'
    for update skip locked
  loop
    if not exists (
      select 1 from brb_private.ticket_payments p where p.request_id = expired.id
      and p.status not in ('expired','failed','canceled')
    ) then
      update brb_private.ticket_requests set status='cancelada', updated_at=now()
      where id=expired.id;
      update brb_private.ticket_listings set status='ativo'
      where id=expired.listing_id and status='em_intermediacao';
    end if;
  end loop;

  insert into brb_private.ticket_mail(request_id, recipient_id, stage)
  select r.id, u.id, 'transferencia_atrasada'
  from brb_private.ticket_requests r
  cross join auth.users u
  where r.status='pagamento_confirmado'
    and r.payment_confirmed_at <= now() - interval '24 hours'
    and u.email_confirmed_at is not null and brb_private.is_owner(u.id)
  on conflict (request_id, recipient_id, stage) do nothing;

  return coalesce((
    select jsonb_agg(to_jsonb(candidate)) from (
      select p.request_id, p.provider_id, p.mode
      from brb_private.ticket_payments p
      join brb_private.ticket_requests r on r.id=p.request_id
      where r.status='solicitada' and r.created_at <= now() - interval '10 minutes'
        and p.status='pending' and p.provider_id is not null
      order by r.created_at limit 20
    ) candidate
  ), '[]'::jsonb);
end $$;

alter function public.brb_ticket_service(text,jsonb) rename to brb_ticket_service_before_maintenance;
revoke all on function public.brb_ticket_service_before_maintenance(text,jsonb) from public, anon, authenticated, service_role;
create function public.brb_ticket_service(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if action='ticket_maintenance' then
    return brb_private.maintain_ticket_requests();
  end if;
  return public.brb_ticket_service_before_maintenance(action,payload);
end $$;
revoke all on function public.brb_ticket_service(text,jsonb) from public, anon, authenticated;
grant execute on function public.brb_ticket_service(text,jsonb) to service_role;

commit;
