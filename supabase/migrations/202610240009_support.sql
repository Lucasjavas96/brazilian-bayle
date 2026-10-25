begin;
create table brb_private.support_tickets (
 id uuid primary key,
 created_at timestamptz not null default now(),
 name text not null,
 email text not null,
 topic text not null,
 message text not null,
 page text not null,
 ip_hash text not null,
 status text not null default 'sending' check(status in ('sending','sent','failed'))
);
alter table brb_private.support_tickets enable row level security;
revoke all on brb_private.support_tickets from public,anon,authenticated;
create index support_rate_ip on brb_private.support_tickets(ip_hash,created_at);
create index support_rate_email on brb_private.support_tickets(email,created_at);

create function public.brb_support_reserve(p_id uuid,p_ip text,p_name text,p_email text,p_topic text,p_message text,p_page text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior brb_private.support_tickets;
begin
 if p_ip !~ '^[a-f0-9]{64}$' or length(trim(p_name)) not between 2 and 80
 or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or p_topic not in ('conta','votacao','album','spotted','clube','outro')
 or length(trim(p_message)) not between 20 and 3000
 or length(p_page)>200 or left(p_page,1)<>'/' then
  raise exception 'invalid_support_request';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(621460240009);
 select * into prior from brb_private.support_tickets where id=p_id;
 if found then
  if prior.ip_hash<>p_ip then raise exception 'invalid_support_request'; end if;
  return jsonb_build_object('id',prior.id,'status',prior.status,'fresh',false);
 end if;
 if exists(select 1 from brb_private.support_tickets where ip_hash=p_ip and created_at>now()-interval '60 seconds')
 or (select count(*) from brb_private.support_tickets where ip_hash=p_ip and created_at>now()-interval '1 hour')>=3
 or (select count(*) from brb_private.support_tickets where email=lower(trim(p_email)) and created_at>now()-interval '1 day')>=3
 or (select count(*) from brb_private.support_tickets where created_at>now()-interval '1 day')>=100 then
  raise exception 'support_rate_limit';
 end if;
 delete from brb_private.support_tickets where created_at<now()-interval '6 months';
 insert into brb_private.support_tickets(id,name,email,topic,message,page,ip_hash)
 values(p_id,trim(p_name),lower(trim(p_email)),p_topic,trim(p_message),p_page,p_ip);
 return jsonb_build_object('id',p_id,'status','sending','fresh',true);
end $$;
revoke all on function public.brb_support_reserve(uuid,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.brb_support_reserve(uuid,text,text,text,text,text,text) to service_role;

create function public.brb_support_finish(p_id uuid,p_sent boolean)
returns void language sql security definer set search_path='' as $$
 update brb_private.support_tickets set status=case when p_sent then 'sent' else 'failed' end where id=p_id;
$$;
revoke all on function public.brb_support_finish(uuid,boolean) from public,anon,authenticated;
grant execute on function public.brb_support_finish(uuid,boolean) to service_role;
commit;
