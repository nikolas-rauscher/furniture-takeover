begin;
alter table public.profiles add column bio text not null default '' check(length(bio)<=500);
grant insert(bio),update(bio) on public.profiles to authenticated;
alter table public.account_preferences
 add column postal_code text not null default '' check(length(postal_code)<=20),
 add column country text not null default '' check(length(country)<=80),
 add column handover text not null default '' check(handover in('','pickup','shipping','both'));

-- Only encrypted, authenticated AES-GCM payloads belong here. The encryption
-- key lives in the Node environment, never in Supabase or the browser.
create table public.account_api_keys (
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 provider text not null check(provider in('deepseek','brave')),
 encrypted_key text not null check(length(encrypted_key) between 60 and 900 and encrypted_key ~ '^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$'),
 last_four text not null check(length(last_four)=4),
 updated_at timestamptz not null default now(),
 primary key(user_id,provider)
);
alter table public.account_api_keys enable row level security;
revoke all on public.account_api_keys from anon,authenticated;
grant select,insert,update,delete on public.account_api_keys to authenticated;
create policy api_keys_read on public.account_api_keys for select to authenticated using(user_id=(select auth.uid()));
create policy api_keys_insert on public.account_api_keys for insert to authenticated with check(user_id=(select auth.uid()));
create policy api_keys_update on public.account_api_keys for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy api_keys_delete on public.account_api_keys for delete to authenticated using(user_id=(select auth.uid()));
commit;
