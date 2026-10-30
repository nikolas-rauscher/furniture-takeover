begin;
create table public.listings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 title text not null check (length(btrim(title)) between 1 and 180),
 description text not null default '' check(length(description)<=4000),
 price numeric(12,2) not null check(price>=0 and price<=1000000),
 location text not null check(length(btrim(location)) between 1 and 180),
 condition text not null default '' check(length(condition)<=180),
 dimensions text not null default '' check(length(dimensions)<=180),
 pickup text not null default '' check(length(pickup)<=300),
 images text[] not null default '{}' check(cardinality(images)<=6),
 status text not null default 'active' check(status in ('active','reserved','sold','withdrawn')),
 created_at timestamptz not null default now()
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.listings(id),
 buyer_id uuid not null references auth.users(id),
 seller_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(listing_id,buyer_id), check(buyer_id<>seller_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.conversations(id),
 sender_id uuid not null references auth.users(id) default auth.uid(),
 body text not null check(length(btrim(body)) between 1 and 4000),
 created_at timestamptz not null default now()
);
create table public.conversation_archives (
 conversation_id uuid not null references public.conversations(id),
 user_id uuid not null references auth.users(id) default auth.uid(),
 primary key(conversation_id,user_id)
);
create index on public.listings(status,created_at desc);
create index on public.listings(owner_id);
create index on public.conversations(buyer_id);
create index on public.conversations(seller_id);
create index on public.messages(conversation_id,created_at);
alter table public.listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_archives enable row level security;
revoke all on public.listings,public.conversations,public.messages,public.conversation_archives from anon,authenticated;
grant select on public.listings to anon,authenticated;
grant insert on public.listings to authenticated;
grant update(title,description,price,location,condition,dimensions,pickup,images,status) on public.listings to authenticated;
grant select on public.conversations,public.messages to authenticated;
grant insert(id,conversation_id,sender_id,body) on public.messages to authenticated;
grant select,insert,delete on public.conversation_archives to authenticated;
create policy listing_public_read on public.listings for select to anon using(status in ('active','reserved'));
create policy listing_read on public.listings for select to authenticated using (
 status in ('active','reserved') or owner_id=auth.uid() or exists(select 1 from public.conversations c where c.listing_id=listings.id and auth.uid() in (c.buyer_id,c.seller_id))
);
create policy listing_insert on public.listings for insert to authenticated with check(owner_id=auth.uid());
create policy listing_update on public.listings for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy conversation_read on public.conversations for select to authenticated using(auth.uid() in (buyer_id,seller_id));
create policy message_read on public.messages for select to authenticated using(exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in(c.buyer_id,c.seller_id)));
create policy message_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in(c.buyer_id,c.seller_id)));
create policy archive_read on public.conversation_archives for select to authenticated using(user_id=auth.uid());
create policy archive_insert on public.conversation_archives for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in(c.buyer_id,c.seller_id)));
create policy archive_delete on public.conversation_archives for delete to authenticated using(user_id=auth.uid());
create function public.start_conversation(item uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare seller uuid; result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to message a seller'; end if;
 select id into result from public.conversations where listing_id=item and buyer_id=auth.uid();
 if result is not null then return result; end if;
 select owner_id into seller from public.listings where id=item and status='active' for share;
 if seller is null or seller=auth.uid() then raise exception 'This listing cannot be contacted'; end if;
 insert into public.conversations(listing_id,buyer_id,seller_id) values(item,auth.uid(),seller)
 on conflict(listing_id,buyer_id) do update set listing_id=excluded.listing_id returning id into result;
 return result;
end $$;
revoke all on function public.start_conversation(uuid) from public;
grant execute on function public.start_conversation(uuid) to authenticated;
-- Photo references must belong to this listing owner, including API requests that bypass the UI.
create function public.validate_listing_photos() returns trigger language plpgsql set search_path='' as $$
declare photo text;
begin
 foreach photo in array new.images loop
  if photo is null or photo !~ ('^' || new.owner_id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$') then raise exception 'Invalid photo path'; end if;
 end loop;
 return new;
end $$;
create trigger validate_listing_photos before insert or update on public.listings for each row execute function public.validate_listing_photos();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('listing-photos','listing-photos',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy photo_insert on storage.objects for insert to authenticated with check(bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy photo_read on storage.objects for select to authenticated using(bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy photo_delete on storage.objects for delete to authenticated using(bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text);
alter publication supabase_realtime add table public.messages,public.conversations;
commit;
