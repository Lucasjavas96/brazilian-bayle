begin;
create function brb_private.auto_accept_account_vote() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.kind='vote' and new.payload->>'user_id'=new.identity
 and exists(select 1 from auth.users u where u.id::text=new.identity and u.email_confirmed_at is not null)
 and exists(select 1 from brb_private.event_catalog e where e.id=new.payload->>'party' and e.event_date<=current_date and e.lineup ? (new.payload->>'dj')) then
  new.status:='approved';
  new.payload:=jsonb_set(new.payload,'{is_demo}','false'::jsonb);
 end if;
 return new;
end $$;
revoke all on function brb_private.auto_accept_account_vote() from public,anon,authenticated;
create trigger accept_account_vote before insert on brb_private.submissions
 for each row execute function brb_private.auto_accept_account_vote();
update brb_private.submissions s set status='approved',payload=jsonb_set(s.payload,'{is_demo}','false'::jsonb)
where s.kind='vote' and s.status='pending' and s.payload->>'user_id'=s.identity
and exists(select 1 from auth.users u where u.id::text=s.identity and u.email_confirmed_at is not null)
and exists(select 1 from brb_private.event_catalog e where e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj'));
-- The existing unique index on account identity + party + DJ remains in force.
commit;
