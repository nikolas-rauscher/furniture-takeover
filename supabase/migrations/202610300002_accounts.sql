begin;
-- Only the chosen display name is public. Region and saved items stay private.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
 display_name text not null default '' check(length(btrim(display_name))<=80)
);
create table public.account_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
 pickup_region text not null default '' check(length(pickup_region)<=180)
);
create table public.saved_listings (
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 listing_id uuid not null references public.listings(id) on delete cascade,
 primary key(user_id,listing_id)
);
create table public.blocked_users (
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 blocked_id uuid not null references auth.users(id) on delete cascade,
 primary key(user_id,blocked_id), check(user_id<>blocked_id)
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 listing_id uuid references public.listings(id) on delete cascade,
 message_id uuid references public.messages(id) on delete cascade,
 reason text not null check(length(btrim(reason)) between 1 and 1000),
 created_at timestamptz not null default now(),
 check(num_nonnulls(listing_id,message_id)=1)
);
create index on public.blocked_users(blocked_id);
alter table public.profiles enable row level security;
alter table public.account_preferences enable row level security;
alter table public.saved_listings enable row level security;
alter table public.blocked_users enable row level security;
alter table public.reports enable row level security;
revoke all on public.profiles,public.account_preferences,public.saved_listings,public.blocked_users,public.reports from anon,authenticated;
grant select on public.profiles to anon,authenticated;
grant insert(id,display_name),update(display_name) on public.profiles to authenticated;
grant select,insert,update on public.account_preferences to authenticated;
grant select,insert,delete on public.saved_listings,public.blocked_users to authenticated;
grant select,insert on public.reports to authenticated;
create policy profile_read on public.profiles for select using(true);
create policy profile_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy preferences_own on public.account_preferences to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy saved_read on public.saved_listings for select to authenticated using(user_id=auth.uid());
create policy saved_insert on public.saved_listings for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.listings l where l.id=listing_id and l.status in('active','reserved')));
create policy saved_delete on public.saved_listings for delete to authenticated using(user_id=auth.uid());
create policy blocked_own on public.blocked_users to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy report_read on public.reports for select to authenticated using(reporter_id=auth.uid());
create policy report_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid() and (
 (listing_id is not null and exists(select 1 from public.listings l where l.id=listing_id)) or
 (message_id is not null and exists(select 1 from public.messages m where m.id=message_id))
));
create function public.prevent_blocked_contact() returns trigger language plpgsql security definer set search_path='' as $$
declare buyer uuid; seller uuid;
begin
 if tg_table_name='conversations' then buyer:=new.buyer_id;seller:=new.seller_id;
 else select buyer_id,seller_id into buyer,seller from public.conversations where id=new.conversation_id; end if;
 if exists(select 1 from public.blocked_users where (user_id=buyer and blocked_id=seller) or (user_id=seller and blocked_id=buyer)) then
 raise exception 'Messaging is unavailable for this conversation'; end if;
 return new;
end $$;
revoke all on function public.prevent_blocked_contact() from public;
create trigger check_message_block before insert on public.messages for each row execute function public.prevent_blocked_contact();
create trigger check_conversation_block before insert on public.conversations for each row execute function public.prevent_blocked_contact();
-- The client removes its storage objects using the Storage API first, avoiding orphaned bytes.
create function public.delete_account() returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Sign in to delete your account'; end if;
 if exists(select 1 from storage.objects where bucket_id='listing-photos' and (storage.foldername(name))[1]=actor::text) then
 raise exception 'Remove your uploaded photos before deleting the account'; end if;
 delete from public.conversation_archives where conversation_id in(select id from public.conversations where actor in(buyer_id,seller_id));
 delete from public.messages where conversation_id in(select id from public.conversations where actor in(buyer_id,seller_id));
 delete from public.conversations where actor in(buyer_id,seller_id);
 delete from public.listings where owner_id=actor;
 delete from auth.users where id=actor;
end $$;
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
commit;
