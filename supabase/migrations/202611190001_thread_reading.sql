begin;
-- What each student has read, for unread counts on every device.
create table public.conversation_reads (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 last_read_at timestamptz not null,
 primary key(conversation_id,user_id)
);
-- Pako's latest reading per conversation, private to the student who asked for it.
create table public.pako_drafts (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 for_message_id uuid not null,
 turn jsonb not null check(jsonb_typeof(turn)='object' and octet_length(turn::text)<=16000),
 created_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
-- Students choose whether Pako reads new replies by himself.
alter table public.account_preferences add column pako_auto_read boolean not null default true;
alter table public.conversation_reads enable row level security;
alter table public.pako_drafts enable row level security;
revoke all on public.conversation_reads,public.pako_drafts from anon,authenticated;
grant select,insert,update on public.conversation_reads to authenticated;
grant select,insert,update,delete on public.pako_drafts to authenticated;
create policy reads_own on public.conversation_reads to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.conversations c where c.id=conversation_id and (select auth.uid()) in(c.buyer_id,c.seller_id)));
create policy pako_drafts_own on public.pako_drafts to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.conversations c where c.id=conversation_id and (select auth.uid()) in(c.buyer_id,c.seller_id)));
-- A read marker only moves forward, also when an older device saves later.
create function public.keep_latest_read() returns trigger language plpgsql set search_path='' as $$
begin
 new.last_read_at:=greatest(old.last_read_at,new.last_read_at);
 return new;
end $$;
revoke all on function public.keep_latest_read() from public;
create trigger keep_latest_read before update on public.conversation_reads for each row execute function public.keep_latest_read();

-- Reading replies has its own daily allowance, apart from the 50 searches and listings:
-- a reading costs about a tenth of a search, so students get 150 of them.
create table public.ai_thread_usage (
 day date not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 requests integer not null check(requests between 0 and 150),
 primary key(day,user_id)
);
-- Keep the project total even when an account is deleted and recreated.
create table public.ai_thread_totals (
 day date primary key,
 requests integer not null check(requests between 0 and 1500)
);
alter table public.ai_thread_usage enable row level security;
alter table public.ai_thread_totals enable row level security;
revoke all on public.ai_thread_usage,public.ai_thread_totals from public,anon,authenticated;
grant select on public.ai_thread_usage to authenticated;
create policy thread_usage_read on public.ai_thread_usage for select to authenticated using(user_id=(select auth.uid()));

create function public.ai_thread_quota(spend boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 today date:=(now() at time zone 'UTC')::date;
 resets timestamptz:=((now() at time zone 'UTC')::date+1)::timestamp at time zone 'UTC';
 used integer;
 total integer;
 allowed boolean;
begin
 if actor is null then raise exception 'Sign in to use the assistant'; end if;
 if spend then
  insert into public.ai_thread_totals(day,requests) values(today,0) on conflict do nothing;
  -- Serialize reservations so parallel readings cannot overdraw either budget.
  select requests into total from public.ai_thread_totals where day=today for update;
 else
  select requests into total from public.ai_thread_totals where day=today;
 end if;
 total:=coalesce(total,0);
 select requests into used from public.ai_thread_usage where day=today and user_id=actor;
 used:=coalesce(used,0);
 allowed:=used<150 and total<1500;
 if spend and allowed then
  insert into public.ai_thread_usage(day,user_id,requests) values(today,actor,1)
  on conflict(day,user_id) do update set requests=ai_thread_usage.requests+1;
  update public.ai_thread_totals set requests=requests+1 where day=today;
  used:=used+1;
  total:=total+1;
 end if;
 return jsonb_build_object('allowed',allowed,'limit',150,'remaining',greatest(0,least(150-used,1500-total)),'resetAt',resets);
end $$;
revoke all on function public.ai_thread_quota(boolean) from public,anon;
grant execute on function public.ai_thread_quota(boolean) to authenticated;
commit;
