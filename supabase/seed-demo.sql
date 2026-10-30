-- OPTIONAL SANDBOX DEMO SEED. Review before executing in the SQL Editor.
-- Generated from scripts/fixtures/ebay-research.json; regenerate with --sql.
-- This is not an application migration and must not run automatically.
-- No passwords, confirmed emails, identities or login-capable demo accounts.
-- Source items are references only. All local CHF offers below are synthetic.
begin;
create temporary table demo_seed_owners(id uuid primary key,email text,name text) on commit drop;
insert into demo_seed_owners values
('df5ead21-cb17-52ad-af2d-b6b167100001','takeover-demo-lea@example.invalid','Demo Seller — Léa'),
('df5ead21-cb17-52ad-af2d-b6b167100002','takeover-demo-noe@example.invalid','Demo Seller — Noé'),
('df5ead21-cb17-52ad-af2d-b6b167100003','takeover-demo-mila@example.invalid','Demo Seller — Mila');
create temporary table demo_seed_listings(id uuid primary key,owner_id uuid,title text,description text,price numeric,location text,condition text,dimensions text,pickup text) on commit drop;
insert into demo_seed_listings values
('9e32232f-8942-5138-b6e6-2623d2bc3a19','df5ead21-cb17-52ad-af2d-b6b167100001','[Demo] Retro reading lamp','A warm reading corner accessory with a compact footprint.

SYNTHETIC DEMO — fictional listing; CHF price, location and details are examples. Source availability is not implied.
Inspiration: https://www.ebay.de/itm/168607888789','35','Lausanne · Centre','Good','40 × 40 × 155 cm','evenings after 18:00; one person can carry it.'),
('1a47d652-50ed-56f6-a112-3d37a12f090a','df5ead21-cb17-52ad-af2d-b6b167100002','[Demo] Shared-flat dining set','A solid-wood dining table with four chairs for a shared kitchen.

SYNTHETIC DEMO — fictional listing; CHF price, location and details are examples. Source availability is not implied.
Inspiration: https://www.ebay.de/itm/398391085374','180','Renens · Gare','Used, with surface marks','140 × 80 × 75 cm','Saturday afternoon; table legs detach; bring two people and a van.'),
('b8ae5504-35d2-53a9-988e-6214241d5183','df5ead21-cb17-52ad-af2d-b6b167100003','[Demo] Grey two-seat sofa','A grey two-seat sofa for a small living room.

SYNTHETIC DEMO — fictional listing; CHF price, location and details are examples. Source availability is not implied.
Inspiration: https://www.ebay.de/itm/960053697342','120','Lausanne · Chailly','Good','168 × 80 × 78 cm','Sunday 10:00–13:00; second floor without lift; two people needed.'),
('08fba64c-b9a8-50b2-9e51-31e93a762c24','df5ead21-cb17-52ad-af2d-b6b167100001','[Demo] White bookshelf pair','One wide and one narrow white bookshelf for a study corner.

SYNTHETIC DEMO — fictional listing; CHF price, location and details are examples. Source availability is not implied.
Inspiration: https://www.ebay.de/itm/318243680763','55','Ecublens · EPFL area','Good, small scuffs','80 / 40 × 28 × 202 cm','weekday lunchtime; shelves can be dismantled; bring an extra person.'),
('afce03e9-9fb8-588c-b404-b431ed90cf07','df5ead21-cb17-52ad-af2d-b6b167100002','[Demo] White study desk','A compact white study desk for a laptop and notebooks.

SYNTHETIC DEMO — fictional listing; CHF price, location and details are examples. Source availability is not implied.
Inspiration: https://www.ebay.de/itm/375283897362','45','Lausanne · Sous-Gare','Good','140 × 50 × 75 cm','Thursday after 17:00; ground-floor collection; legs removable.'),
('95acdc3a-91d3-57c6-8904-36edbc0d2349','df5ead21-cb17-52ad-af2d-b6b167100003','[Demo] Anthracite storage cabinet','An anthracite cabinet for books, crockery and everyday storage.

SYNTHETIC DEMO — fictional listing; CHF price, location and details are examples. Source availability is not implied.
Inspiration: https://www.ebay.de/itm/177804573336','60','Prilly · Centre','Used, light wear','100 × 35 × 70 cm','Friday 16:00–19:00; lift available; two people recommended.');
do $$
begin
 if exists(select 1 from auth.users u join demo_seed_owners d on u.id=d.id
  where u.email is distinct from d.email or u.raw_app_meta_data->>'demo_seed' is distinct from 'takeover-ebay-v1'
    or u.encrypted_password is not null or u.email_confirmed_at is not null
    or u.banned_until is distinct from 'infinity'::timestamptz) then
  raise exception 'Reserved demo owner ID belongs to a different or login-capable account';
 end if;
 if exists(select 1 from auth.users u join demo_seed_owners d on lower(u.email)=d.email where u.id<>d.id) then
  raise exception 'Reserved demo email already belongs to another account';
 end if;
 if exists(select 1 from public.profiles p join demo_seed_owners d on p.id=d.id where p.display_name not like 'Demo %') then
  raise exception 'Reserved demo profile ID contains non-demo data';
 end if;
 if exists(select 1 from public.listings l join demo_seed_listings d on l.id=d.id
  where l.owner_id<>d.owner_id or l.title not like '[Demo] %' or position('SYNTHETIC DEMO' in l.description)=0) then
  raise exception 'Reserved demo listing ID contains non-demo data';
 end if;
end $$;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,banned_until,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select id,'00000000-0000-0000-0000-000000000000'::uuid,'authenticated','authenticated',email,null,null,'infinity'::timestamptz,
 '{"demo_seed":"takeover-ebay-v1","synthetic":true}'::jsonb,jsonb_build_object('display_name',name),now(),now()
from demo_seed_owners on conflict(id) do nothing;
insert into public.profiles(id,display_name) select id,name from demo_seed_owners on conflict(id) do nothing;
insert into public.listings(id,owner_id,title,description,price,location,condition,dimensions,pickup,images,status,tags)
select id,owner_id,title,description,price,location,condition,dimensions,pickup,'{}'::text[],'active',array['Demo']
from demo_seed_listings on conflict(id) do nothing;
-- Readback before commit: three inert owners and six seeded listings.
select d.name,u.email,u.encrypted_password is null as no_password,u.email_confirmed_at is null as unconfirmed,u.banned_until from demo_seed_owners d join auth.users u using(id) order by d.name;
select l.id,l.title,l.price,l.status,p.display_name from public.listings l join demo_seed_listings d using(id) join public.profiles p on p.id=l.owner_id order by l.title;
commit;
