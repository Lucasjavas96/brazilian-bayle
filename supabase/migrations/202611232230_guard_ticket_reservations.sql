begin;

create function brb_private.guard_ticket_reservation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ticket-reservation:' || new.buyer_id::text, 0)
  );

  if exists (
    select 1 from brb_private.ticket_requests
    where buyer_id=new.buyer_id and status='solicitada'
  ) then
    raise exception 'Você já tem uma reserva aguardando pagamento.';
  end if;

  if exists (
    select 1 from brb_private.ticket_requests
    where buyer_id=new.buyer_id and status='cancelada'
      and updated_at > now() - interval '1 minute'
  ) then
    raise exception 'Aguarde um minuto após o cancelamento para reservar novamente.';
  end if;

  if not exists (
    select 1 from brb_private.ticket_listings l
    join brb_private.interest_events e on e.id=l.event_id
    where l.id=new.listing_id
      and e.event_date >= (now() at time zone 'America/Sao_Paulo')::date
  ) then
    raise exception 'Esta festa não está mais disponível para reserva.';
  end if;
  return new;
end $$;

create trigger guard_ticket_reservation
before insert on brb_private.ticket_requests
for each row execute function brb_private.guard_ticket_reservation();

commit;
