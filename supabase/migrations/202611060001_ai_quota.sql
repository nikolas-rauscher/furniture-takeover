begin;

create table public.ai_daily_usage (
 day date not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 requests integer not null check(requests between 0 and 50),
 primary key(day,user_id)
);
-- Keep the project total even when an account is deleted and recreated.
create table public.ai_daily_totals (
 day date primary key,
 requests integer not null check(requests between 0 and 500)
);
alter table public.ai_daily_usage enable row level security;
alter table public.ai_daily_totals enable row level security;
revoke all on public.ai_daily_usage,public.ai_daily_totals from public,anon,authenticated;
grant select on public.ai_daily_usage to authenticated;
create policy ai_usage_read on public.ai_daily_usage for select to authenticated using(user_id=(select auth.uid()));

create function public.ai_quota(spend boolean default false) returns jsonb
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
  insert into public.ai_daily_totals(day,requests) values(today,0) on conflict do nothing;
  -- Serialize reservations so parallel requests cannot overdraw either budget.
  select requests into total from public.ai_daily_totals where day=today for update;
 else
  select requests into total from public.ai_daily_totals where day=today;
 end if;
 total:=coalesce(total,0);
 select requests into used from public.ai_daily_usage where day=today and user_id=actor;
 used:=coalesce(used,0);
 allowed:=used<50 and total<500;
 if spend and allowed then
  insert into public.ai_daily_usage(day,user_id,requests) values(today,actor,1)
  on conflict(day,user_id) do update set requests=ai_daily_usage.requests+1;
  update public.ai_daily_totals set requests=requests+1 where day=today;
  used:=used+1;
  total:=total+1;
 end if;
 return jsonb_build_object('allowed',allowed,'limit',50,'remaining',greatest(0,least(50-used,500-total)),'resetAt',resets);
end $$;
revoke all on function public.ai_quota(boolean) from public,anon;
grant execute on function public.ai_quota(boolean) to authenticated;
commit;
