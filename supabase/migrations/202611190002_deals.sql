begin;
-- Terms both students see: whole francs, an exact UTC instant plus the words used, a meeting point.
create function public.valid_deal_terms(t jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(t)='object'
  and t ?& array['amount','fulfillment','pickup_at','pickup_time','pickup_point']
  and jsonb_typeof(t->'pickup_time') in ('null','string')
  and jsonb_typeof(t->'pickup_point') in ('null','string')
  and not exists(select 1 from jsonb_object_keys(t) k where k not in('amount','fulfillment','pickup_at','pickup_time','pickup_point'))
  and coalesce(jsonb_typeof(t->'amount'),'null') in('null','number')
  and (jsonb_typeof(t->'amount') is distinct from 'number' or ((t->>'amount')::numeric between 0 and 1000000 and (t->>'amount')::numeric=trunc((t->>'amount')::numeric)))
  and coalesce(t->>'fulfillment','pickup') in('pickup','shipping')
  and (t->>'pickup_at' is null or t->>'pickup_at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$')
  and (t->>'pickup_at' is null or t->>'pickup_time' is not null)
  and (t->>'pickup_time' is null or length(btrim(t->>'pickup_time')) between 1 and 240)
  and (t->>'pickup_point' is null or length(btrim(t->>'pickup_point')) between 1 and 240)
$$;
create function public.complete_deal_terms(t jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(t->'amount')='number' and (t->>'fulfillment'='shipping'
  or (t->>'fulfillment'='pickup' and t->>'pickup_at' is not null and t->>'pickup_point' is not null))
$$;
-- The message must say what it records (same rules as messageStatesTerms in shared/deal.ts).
create function public.body_states_terms(body text, t jsonb) returns boolean language sql stable set search_path='' as $$
 select (jsonb_typeof(t->'amount') is distinct from 'number' or case when (t->>'amount')::numeric=0
    then body ~* '(chf ?0(?![0-9])|\m(free|gratuit|gratuite|gratis|kostenlos)\M)'
    else body ~* ('chf ?'||regexp_replace(trim_scale((t->>'amount')::numeric)::text,'(\d)(?=(\d{3})+$)','\1[,'' ]?','g')||'(?![0-9])') end)
  and (t->>'pickup_point' is null or strpos(lower(body),lower(t->>'pickup_point'))>0)
  and (t->>'pickup_at' is null or strpos(body,to_char((t->>'pickup_at')::timestamptz at time zone 'Europe/Zurich','HH24:MI'))>0)
  and (t->>'pickup_at' is not null or t->>'pickup_time' is null or strpos(lower(body),lower(t->>'pickup_time'))>0)
$$;
create table public.deals (
 conversation_id uuid primary key references public.conversations(id) on delete cascade,
 listing_id uuid not null references public.listings(id) on delete cascade,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 version integer not null default 0 check(version>=0),
 status text not null default 'open' constraint deals_status_check check(status in('open','agreed','completed','cancelled')),
 proposal jsonb check(proposal is null or public.valid_deal_terms(proposal)),
 proposal_by text check(proposal_by in('buyer','seller')),
 proposal_message_id uuid references public.messages(id) on delete set null,
 agreed jsonb check(agreed is null or public.valid_deal_terms(agreed)),
 agreed_at timestamptz,
 pickup_at timestamptz,
 outcome text constraint deals_outcome_check check(outcome in('picked_up','cancelled','no_show','listing_reopened')),
 outcome_by text check(outcome_by in('buyer','seller')),
 updated_at timestamptz not null default now(),
 check((proposal is null)=(proposal_by is null)),
 check(status<>'agreed' or agreed is not null)
);
create unique index deals_one_agreed_per_listing on public.deals(listing_id) where status='agreed';
create index on public.deals(buyer_id);
create index on public.deals(seller_id);
create table public.deal_events (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.deals(conversation_id) on delete cascade,
 actor_role text check(actor_role in('buyer','seller')),  -- null for system events
 kind text not null constraint deal_events_kind_check check(kind in('proposed','accepted','declined','withdrawn','cancelled','superseded','listing_reopened','completed')),
 terms jsonb check(terms is null or public.valid_deal_terms(terms)),
 message_id uuid references public.messages(id) on delete set null,
 created_at timestamptz not null default now()
);
create index on public.deal_events(conversation_id,created_at);
alter table public.deals enable row level security;
alter table public.deal_events enable row level security;
revoke all on public.deals,public.deal_events from anon,authenticated;
grant select on public.deals,public.deal_events to authenticated;
create policy deal_read on public.deals for select to authenticated using((select auth.uid()) in(buyer_id,seller_id));
create policy deal_event_read on public.deal_events for select to authenticated using(exists(
 select 1 from public.deals d where d.conversation_id=deal_events.conversation_id and (select auth.uid()) in(d.buyer_id,d.seller_id)));

create function public.sync_deals_with_listing() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='reserved' and new.status<>'reserved' then
  with changed as (
   update public.deals set status=case when new.status='sold' then 'completed' else 'cancelled' end,
    outcome=case when new.status='sold' then 'picked_up' else 'listing_reopened' end,
    outcome_by='seller', version=version+1, updated_at=now()
   where listing_id=new.id and status='agreed' returning conversation_id,status)
  insert into public.deal_events(conversation_id,actor_role,kind)
   select conversation_id,'seller',case when status='completed' then 'completed' else 'listing_reopened' end from changed;
 end if;
 return new;
end $$;
revoke all on function public.sync_deals_with_listing() from public;
create trigger sync_deals_with_listing after update of status on public.listings for each row execute function public.sync_deals_with_listing();

create or replace function public.delete_account() returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign in to delete your account'; end if;
 if exists(select 1 from storage.objects where bucket_id='listing-photos' and (storage.foldername(name))[1]=actor::text) then
 raise exception 'Remove your uploaded photos before deleting the account'; end if;
 update public.listings l set status='active' from public.deals d
 where d.listing_id=l.id and d.buyer_id=actor and d.status='agreed' and l.status='reserved';
 delete from public.conversation_archives where conversation_id in(select id from public.conversations where actor in(buyer_id,seller_id));
 delete from public.messages where conversation_id in(select id from public.conversations where actor in(buyer_id,seller_id));
 delete from public.conversations where actor in(buyer_id,seller_id);
 delete from public.listings where owner_id=actor;
 delete from auth.users where id=actor;
end $$;
create function public.deal_action(p_conversation uuid, p_message uuid, p_body text, p_action text,
 p_terms jsonb default null, p_expected_version integer default 0, p_reason text default null)
returns public.deals language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 c public.conversations;
 d public.deals;
 m public.messages;
 me text;
 availability text;
 kind text;
 was_agreed boolean;
begin
 if actor is null then raise exception 'sign_in_required'; end if;
 select * into c from public.conversations where id=p_conversation;
 if not found or actor not in(c.buyer_id,c.seller_id) then raise exception 'conversation_unavailable'; end if;
 me:=case when actor=c.buyer_id then 'buyer' else 'seller' end;
 p_body:=regexp_replace(p_body,'^[[:space:]]+|[[:space:]]+$','','g');
 if p_body is null or length(p_body) not between 1 and 4000 or p_message is null then raise exception 'message_invalid'; end if;
 -- Serialize competing buyers and concurrent retries before checking the message receipt.
 select status into availability from public.listings where id=c.listing_id for update;
 select * into m from public.messages where id=p_message;
 if found then
   if m.sender_id<>actor or m.conversation_id<>p_conversation or m.body<>p_body or not exists(select 1 from public.deal_events where message_id=p_message)
   then raise exception 'message_conflict'; end if;
   select * into strict d from public.deals where conversation_id=p_conversation;
   return d;
 end if;
 insert into public.deals(conversation_id,listing_id,buyer_id,seller_id) values(c.id,c.listing_id,c.buyer_id,c.seller_id) on conflict do nothing;
 select * into strict d from public.deals where conversation_id=c.id for update;
 if d.version is distinct from p_expected_version then raise exception 'deal_changed'; end if;
 if d.status in ('completed','cancelled') or (d.status='agreed' and p_action<>'cancel') then raise exception 'deal_closed'; end if;
 was_agreed:=d.status='agreed';
 if p_action in ('propose','accept') then
   if jsonb_typeof(p_terms) is distinct from 'object' or public.valid_deal_terms(p_terms) is not true then raise exception 'terms_invalid'; end if;
   if availability<>'active' then raise exception 'listing_unavailable'; end if;
   if public.body_states_terms(p_body,p_terms) is not true then raise exception 'terms_not_stated'; end if;
   if d.proposal_by<>me and d.proposal=p_terms then p_action:='accept'; end if;
 end if;
 case p_action
 when 'propose' then
   kind:='proposed'; d.proposal:=p_terms; d.proposal_by:=me;
 when 'accept' then
   if d.proposal_by is null or d.proposal_by=me or d.proposal is distinct from p_terms then raise exception 'deal_changed'; end if;
   if public.complete_deal_terms(p_terms) is not true then raise exception 'terms_incomplete'; end if;
   d.pickup_at:=(p_terms->>'pickup_at')::timestamptz;
   if p_terms->>'fulfillment'='pickup' and d.pickup_at<=now() then raise exception 'pickup_time_past'; end if;
   kind:='accepted'; d.agreed:=p_terms; d.agreed_at:=now(); d.status:='agreed';
 when 'withdraw','decline' then
   if d.proposal_by is null or (me=d.proposal_by)<>(p_action='withdraw') then raise exception 'deal_changed'; end if;
   kind:=case when p_action='withdraw' then 'withdrawn' else 'declined' end;
 when 'cancel' then
   if p_reason is null or p_reason not in('changed_mind','cant_make_it') then raise exception 'reason_invalid'; end if;
   kind:='cancelled'; d.status:='cancelled'; d.outcome:='cancelled'; d.outcome_by:=me;
 else raise exception 'action_invalid';
 end case;
 insert into public.messages(id,conversation_id,sender_id,body) values(p_message,c.id,actor,p_body);
 if kind='proposed' then d.proposal_message_id:=p_message;
 else d.proposal:=null; d.proposal_by:=null; d.proposal_message_id:=null; end if;
 update public.deals set status=d.status,proposal=d.proposal,proposal_by=d.proposal_by,proposal_message_id=d.proposal_message_id,
 agreed=d.agreed,agreed_at=d.agreed_at,pickup_at=d.pickup_at,outcome=d.outcome,outcome_by=d.outcome_by,version=d.version+1,updated_at=now()
 where conversation_id=c.id returning * into d;
 insert into public.deal_events(conversation_id,actor_role,kind,terms,message_id)
 values(c.id,me,kind,case when kind in ('proposed','accepted') then p_terms end,p_message);
 if kind='accepted' then
   update public.listings set status='reserved' where id=c.listing_id;
   with cleared as (
    update public.deals set proposal=null,proposal_by=null,proposal_message_id=null,version=version+1,updated_at=now()
    where listing_id=c.listing_id and status='open' and proposal is not null returning conversation_id)
   insert into public.deal_events(conversation_id,kind) select conversation_id,'superseded' from cleared;
 elsif was_agreed and kind='cancelled' then
   update public.listings set status='active' where id=c.listing_id and status='reserved';
 end if;
 return d;
end $$;
revoke all on function public.deal_action(uuid,uuid,text,text,jsonb,integer,text) from public;
grant execute on function public.deal_action(uuid,uuid,text,text,jsonb,integer,text) to authenticated;
alter publication supabase_realtime add table public.deals,public.deal_events;
commit;
