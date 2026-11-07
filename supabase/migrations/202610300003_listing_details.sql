begin;
alter table public.listings add column pickup_by date;
alter table public.listings add column tags text[] not null default '{}' check(cardinality(tags)<=20);
grant update(pickup_by,tags) on public.listings to authenticated;
commit;
