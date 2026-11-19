begin;
-- A card-size copy of each uploaded photo, paired by position with images; demo drawings need none.
alter table public.listings add column card_images text[] not null default '{}';
grant update(card_images) on public.listings to authenticated;

create or replace function public.validate_listing_photos() returns trigger
language plpgsql security definer set search_path='' as $$
declare photo text;
begin
 foreach photo in array new.images loop
  if photo ~ ('^' || new.owner_id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$') then continue; end if;
  if photo ~ '^/samples/[a-z0-9-]+\.svg$' and new.tags @> array['Demo']
    and takeover_admin.is_demo_seller(new.owner_id) and exists(
      select 1 from takeover_admin.catalog c, jsonb_array_elements(c.listings) l where l->>'image'=photo
    ) and cardinality(new.card_images)=0 then continue; end if;
  raise exception 'Invalid photo path';
 end loop;
 if cardinality(new.card_images) not in (0, cardinality(new.images)) then
  raise exception 'Invalid card photo list';
 end if;
 foreach photo in array new.card_images loop
  if photo is null or photo !~ ('^' || new.owner_id::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$')
  then raise exception 'Invalid card photo path'; end if;
 end loop;
 return new;
end $$;
revoke all on function public.validate_listing_photos() from public, anon, authenticated;

-- Seeding and admin edits replace the photo with a drawing, so any card copies go with it.
create or replace function takeover_admin.seed_demo_catalog(reset_catalog boolean) returns jsonb
language plpgsql set search_path='' as $$
declare shipped takeover_admin.catalog; seed_seller record;
begin
 perform pg_advisory_xact_lock(561902, 4);
 select * into strict shipped from takeover_admin.catalog;
 if exists(
  select 1 from jsonb_to_recordset(shipped.sellers) as d(id uuid,email text)
  join auth.users u on u.id=d.id or lower(u.email)=d.email
  where u.id<>d.id or u.email is null
   or u.email not in (d.email,replace(d.email,'takeover-demo-v2-','takeover-demo-'))
   or not takeover_admin.is_demo_seller(u.id)
 ) or exists(
  select 1 from jsonb_to_recordset(shipped.listings) as d(id uuid,"sellerId" uuid)
  join public.listings l on l.id=d.id where l.owner_id<>d."sellerId" or not (l.tags @> array['Demo'])
 ) then raise exception 'admin_seed_conflict'; end if;

 -- The older optional seed used a different marker and email namespace.
 delete from public.listings l using auth.users u
  where l.owner_id=u.id and u.raw_app_meta_data->>'demo_seed'='takeover-ebay-v1'
   and not exists(select 1 from public.conversations c where c.listing_id=l.id)
   and not exists(select 1 from public.reports r where r.listing_id=l.id);
 delete from auth.users u where u.raw_app_meta_data->>'demo_seed'='takeover-ebay-v1'
  and not exists(select 1 from public.listings l where l.owner_id=u.id)
  and not exists(select 1 from public.conversations c where u.id in (c.buyer_id,c.seller_id));

 if reset_catalog then
  perform l.id from public.listings l where takeover_admin.is_demo_seller(l.owner_id)
    and l.tags @> array['Demo'] order by l.id for update;
  if exists(
   select 1 from public.deals d join public.listings l on l.id=d.listing_id
   where d.status='agreed' and takeover_admin.is_demo_seller(l.owner_id) and l.tags @> array['Demo']
  ) then raise exception 'admin_deal_agreed'; end if;

  update public.listings l set hidden_at=coalesce(l.hidden_at,now()),demo_retired=true
   where l.tags @> array['Demo'] and takeover_admin.is_demo_seller(l.owner_id)
     and not exists(select 1 from jsonb_array_elements(shipped.listings) x where x->>'id'=l.id::text);
  delete from public.listings l where l.demo_retired and takeover_admin.is_demo_seller(l.owner_id)
   and not exists(select 1 from public.conversations c where c.listing_id=l.id)
   and not exists(select 1 from public.reports r where r.listing_id=l.id);
  update public.profiles s set demo_retired=true where takeover_admin.is_demo_seller(s.id)
   and not exists(select 1 from jsonb_array_elements(shipped.sellers) x where x->>'id'=s.id::text);
 end if;

 for seed_seller in select * from jsonb_to_recordset(shipped.sellers) as x(id uuid,email text,name text) loop
  perform takeover_admin.create_seller(seed_seller.id,seed_seller.email,seed_seller.name);
  insert into public.profiles(id,display_name) values(seed_seller.id,seed_seller.name)
  on conflict(id) do update set display_name=excluded.display_name,demo_retired=false
   where reset_catalog;
  if reset_catalog then delete from takeover_admin.demo_seller_notes where seller_id=seed_seller.id; end if;
 end loop;

 insert into public.listings(id,owner_id,title,description,price,location,condition,dimensions,pickup,
   pickup_by,images,status,tags,demo_meeting_point)
 select id,"sellerId",title,description,price,location,condition,dimensions,pickup,
   nullif("pickupBy",'')::date,array[image],status,array['Demo'],"meetingPoint"
 from jsonb_to_recordset(shipped.listings) as x(id uuid,"sellerId" uuid,title text,description text,
   price numeric,location text,condition text,dimensions text,pickup text,"pickupBy" text,image text,
   status text,"meetingPoint" text)
 on conflict(id) do update set title=excluded.title,description=excluded.description,price=excluded.price,
  location=excluded.location,condition=excluded.condition,dimensions=excluded.dimensions,pickup=excluded.pickup,
  pickup_by=excluded.pickup_by,images=excluded.images,card_images='{}',status=excluded.status,tags=excluded.tags,
  demo_meeting_point=excluded.demo_meeting_point,hidden_at=null,demo_retired=false
 where reset_catalog;
 return jsonb_build_object('listings',jsonb_array_length(shipped.listings),'sellers',jsonb_array_length(shipped.sellers));
end $$;

create or replace function public.admin_save_demo_listing(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.listings; owner uuid; item uuid; field text; deadline date;
begin
 perform takeover_admin.require_admin();
 perform pg_advisory_xact_lock(561902, 4);
 owner:=takeover_admin.input_uuid(p->>'sellerId');
 if not takeover_admin.is_demo_seller(owner) or not exists(select 1 from public.profiles where id=owner and not demo_retired)
 then raise exception 'admin_seller_missing'; end if;

 foreach field in array array['title','description','condition','location','meetingPoint','pickup','pickupBy','image','status'] loop
  if jsonb_typeof(p->field) is distinct from 'string' then raise exception 'admin_invalid_input'; end if;
 end loop;
 if length(btrim(p->>'title')) not between 1 and 180 or length(btrim(p->>'location')) not between 1 and 180
  or length(p->>'description')>4000 or length(p->>'condition')>180 or length(p->>'pickup')>300
  or jsonb_typeof(p->'price') is distinct from 'number'
  or p->>'status' not in ('active','reserved','sold') then raise exception 'admin_invalid_input'; end if;
 if (p->>'price')::numeric not between 0 and 1000000 or round((p->>'price')::numeric,2)<>(p->>'price')::numeric
  or not exists(select 1 from takeover_admin.catalog c where
   (p->>'meetingPoint'='' or p->>'meetingPoint'=any(c.meeting_points)) and
   exists(select 1 from jsonb_array_elements(c.listings) x where x->>'image'=p->>'image'))
 then raise exception 'admin_invalid_input'; end if;
 if p->>'pickupBy'<>'' then
  if p->>'pickupBy' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'admin_invalid_input'; end if;
  begin deadline:=(p->>'pickupBy')::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception 'admin_invalid_input';
  end;
 end if;

 if not (p ? 'id') then
  insert into public.listings(owner_id,title,description,price,location,condition,pickup,images,status,pickup_by,tags,demo_meeting_point)
   values(owner,btrim(p->>'title'),p->>'description',(p->>'price')::numeric,btrim(p->>'location'),p->>'condition',
    p->>'pickup',array[p->>'image'],p->>'status',deadline,array['Demo'],p->>'meetingPoint') returning * into l;
 else
  item:=takeover_admin.input_uuid(p->>'id');
  select * into l from public.listings where id=item and tags @> array['Demo'] and not demo_retired
   and takeover_admin.is_demo_seller(owner_id) for update;
  if not found then raise exception 'admin_listing_missing'; end if;
  if l.owner_id<>owner then raise exception 'admin_invalid_input'; end if;
  if l.status<>p->>'status' then perform takeover_admin.require_no_deal(item); end if;
  update public.listings set title=btrim(p->>'title'),description=p->>'description',price=(p->>'price')::numeric,
   location=btrim(p->>'location'),condition=p->>'condition',pickup=p->>'pickup',images=array[p->>'image'],card_images='{}',
   status=p->>'status',pickup_by=deadline,demo_meeting_point=p->>'meetingPoint' where id=item returning * into l;
 end if;
 return takeover_admin.listing_json(l);
end $$;

commit;
