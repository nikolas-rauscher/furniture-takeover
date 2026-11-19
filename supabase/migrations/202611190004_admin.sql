begin;

create schema takeover_admin;
revoke all on schema takeover_admin from public, anon, authenticated;

create table public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admins where user_id=auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create function takeover_admin.require_admin() returns void
language plpgsql set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'admin_required'; end if;
end $$;

alter table public.listings
 add column hidden_at timestamptz,
 add column demo_retired boolean not null default false,
 add column demo_meeting_point text not null default '';
alter table public.profiles
 add column demo_retired boolean not null default false;
alter table public.reports add column resolved_at timestamptz;

create table takeover_admin.demo_seller_notes (
 seller_id uuid primary key references auth.users(id) on delete cascade,
 note text not null check(length(note)<=1000)
);
create table takeover_admin.student_blocks (
 student_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null check(length(reason) between 1 and 1000),
 created_at timestamptz not null default now()
);
create table public.moderation_log (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null,
 action text not null check(action in ('hide_listing','restore_listing','block_student','unblock_student','resolve_report','reset_demo')),
 target_id uuid,
 reason text not null check(length(reason) between 1 and 1000),
 created_at timestamptz not null default now()
);
alter table public.moderation_log enable row level security;
revoke all on public.moderation_log from public, anon, authenticated;
grant select on public.moderation_log to authenticated;
create policy moderation_log_admin_read on public.moderation_log for select to authenticated using ((select public.is_admin()));

alter policy listing_public_read on public.listings using(hidden_at is null and status in ('active','reserved'));
alter policy listing_read on public.listings using (
 owner_id=(select auth.uid()) or (select public.is_admin()) or (
  hidden_at is null and (status in ('active','reserved') or exists(
   select 1 from public.conversations c where c.listing_id=listings.id and auth.uid() in (c.buyer_id,c.seller_id)
  ))
 )
);

create table takeover_admin.catalog (
 singleton boolean primary key default true check(singleton),
 sellers jsonb not null,
 listings jsonb not null,
 meeting_points text[] not null
);
-- BEGIN SHIPPED CATALOG
insert into takeover_admin.catalog(sellers,listings,meeting_points) values(
jsonb_build_array(
 '{"id":"df5ead21-cb17-52ad-af2d-b6b167200001","name":"Léa","email":"takeover-demo-v2-lea@example.invalid"}'::jsonb,
 '{"id":"df5ead21-cb17-52ad-af2d-b6b167200002","name":"Arjun","email":"takeover-demo-v2-arjun@example.invalid"}'::jsonb,
 '{"id":"df5ead21-cb17-52ad-af2d-b6b167200003","name":"Mia","email":"takeover-demo-v2-mia@example.invalid"}'::jsonb,
 '{"id":"df5ead21-cb17-52ad-af2d-b6b167200004","name":"Jonas","email":"takeover-demo-v2-jonas@example.invalid"}'::jsonb,
 '{"id":"df5ead21-cb17-52ad-af2d-b6b167200005","name":"Sofia","email":"takeover-demo-v2-sofia@example.invalid"}'::jsonb,
 '{"id":"df5ead21-cb17-52ad-af2d-b6b167200006","name":"Noé","email":"takeover-demo-v2-noe@example.invalid"}'::jsonb
),
jsonb_build_array(
 '{"id":"7bb7bd57-22dc-5cc3-a120-79d62781ed31","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200002","title":"City bicycle","description":"Hey! Selling my trusty city bike, it got me to EPFL and back all year. 7 gears, front basket, both lights and a solid rear rack. I oiled the chain in October and the tyres are fairly new. A few scratches on the frame, nothing scary. Lock not included. Happy to let you test-ride it around the block!","price":145,"location":"FMEL Triaudes · Ecublens","meetingPoint":"FMEL Triaudes · outside entrance","condition":"Good","dimensions":"Frame 54 cm · 28-inch wheels","pickup":"Weekday evenings after 18:00","pickupBy":"","image":"/samples/city-bicycle.svg","status":"active"}'::jsonb,
 '{"id":"ad3820f7-5b78-531a-b9e0-079fff591b01","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200006","title":"Vinyl turntable","description":"Belt-drive turntable, 33 and 45 rpm. Works. New cartridge last spring. Dust cover included. No built-in speakers: needs an amp or active speakers. Cash or Twint.","price":85,"location":"FMEL Vortex · Chavannes","meetingPoint":"FMEL Vortex · outside reception","condition":"Very good","dimensions":"42 × 35 × 12 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/vinyl-turntable.svg","status":"active"}'::jsonb,
 '{"id":"fe3bb7e4-9cdd-5ada-b8ef-755879fc5d7e","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200003","title":"Espresso machine","description":"Pump espresso machine, 15 bar, 1.2 l water tank, steam wand for milk. Bought in 2023, descaled on 3 November. Comes with the portafilter, two filter baskets (single and double) and the tamper. The drip tray has a small crack at the back left corner; it still holds water. Weight 4.6 kg.","price":70,"location":"FMEL Ochettes · Chavannes","meetingPoint":"FMEL Ochettes · outside entrance","condition":"Good","dimensions":"24 × 31 × 28 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/espresso-machine.svg","status":"active"}'::jsonb,
 '{"id":"a8f7e93f-d940-5fb5-bb93-00d9d7bf3056","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Standing floor lamp","description":"Tall floor lamp with a cream shade, perfect for a reading corner. The light is really warm. E27 bulb included. I''m moving out at the end of the month, so it needs to go by 30 November. Merci!","price":30,"location":"FMEL Bourdonnette · Lausanne","meetingPoint":"FMEL Bourdonnette · outside entrance","condition":"Good","dimensions":"Height 155 cm","pickup":"Pickup by 30 Nov","pickupBy":"2026-11-30","image":"/samples/standing-floor-lamp.svg","status":"active"}'::jsonb,
 '{"id":"801d853b-e8de-5f78-9d8a-e2480d6f140f","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200004","title":"Full-length mirror","description":"Full-length mirror with a wooden frame. Leans on the wall, no drilling needed. Glass is fine, no cracks. Fits in a Golf. I''m at the Learning Center most days.","price":35,"location":"EPFL · Ecublens","meetingPoint":"Rolex Learning Center","condition":"Very good","dimensions":"50 × 160 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/full-length-mirror.svg","status":"active"}'::jsonb,
 '{"id":"6794c822-970d-5781-b20b-2e37e382e451","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200001","title":"Wooden sideboard","description":"Solid wood sideboard with three doors. Used but sturdy. Scratches on the top. Two people to carry it. Weekend only.","price":120,"location":"EPFL Quartier Nord","meetingPoint":"SwissTech Convention Center","condition":"Used","dimensions":"120 × 40 × 75 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/wooden-sideboard.svg","status":"active"}'::jsonb,
 '{"id":"2a6dd669-f65a-5d48-b85b-2c4b81b8ef9a","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Potted houseplant","description":"My monstera needs a new home! About 60 cm with its terracotta pot, and a new leaf every few weeks. Water it once a week and give it a bright spot. Dispo presque tous les soirs.","price":12,"location":"Ecublens · Le Croset","meetingPoint":"Place François Silvant","condition":"Good","dimensions":"Height around 60 cm, including pot","pickup":"Flexible pickup","pickupBy":"","image":"/samples/potted-houseplant.svg","status":"active"}'::jsonb,
 '{"id":"599bb0cd-1779-5f6b-bb8d-57aec786aa46","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200006","title":"Over-ear headphones","description":"Over-ear Bluetooth headphones. About 30 h battery. Noise cancelling works. Ear pads replaced in September. USB-C cable and case included. Twint or cash.","price":45,"location":"FMEL Atrium · Ecublens","meetingPoint":"FMEL Atrium · outside entrance","condition":"Very good","dimensions":"Adjustable headband","pickup":"Weekday evenings after 18:00","pickupBy":"","image":"/samples/over-ear-headphones.svg","status":"active"}'::jsonb,
 '{"id":"08dc1b84-a7ea-5f58-91b4-30ac0d8fbe02","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200003","title":"White work desk","description":"White work desk, 120 × 60 × 75 cm, with two drawers on the right (each 38 × 40 cm). Melamine top, load capacity 40 kg. Two small marks on the left edge, otherwise no damage. The legs unscrew with the Allen key I''ll hand over, so it fits flat in an estate car. Smoke-free flat.","price":65,"location":"FMEL Atrium · Ecublens","meetingPoint":"FMEL Atrium · outside entrance","condition":"Good","dimensions":"120 × 60 × 75 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/white-work-desk.svg","status":"active"}'::jsonb,
 '{"id":"06bdc0b0-6105-50cb-ba0a-455b069442a7","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200002","title":"Rice cooker","description":"A rice cooker is the best thing a student can own, I promise. Makes enough for 4-5 people, keeps it warm for hours, and comes with the measuring cup and the spoon. The inner pot is spotless. Selling because I''m moving back home.","price":20,"location":"FMEL Ochettes · Chavannes","meetingPoint":"FMEL Ochettes · outside entrance","condition":"Very good","dimensions":"Capacity 1.8 l · 24 × 24 × 24 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/rice-cooker.svg","status":"active"}'::jsonb,
 '{"id":"cab54bb9-2328-57b1-9a9d-168cd82b88e5","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200002","title":"Two-seat sofa","description":"Blue two-seater and honestly the comfiest spot in our flat. Removable covers (washed in October), wooden legs, one tiny stain on the back cushion you''ll never notice. It''s heavy, so bring a friend. The lift at Ochettes works. It needs to go by 6 December because my flatmate''s sofa arrives then.","price":180,"location":"FMEL Ochettes · Chavannes","meetingPoint":"FMEL Ochettes · outside entrance","condition":"Good","dimensions":"165 × 85 × 78 cm","pickup":"Pickup by 6 Dec","pickupBy":"2026-12-06","image":"/samples/two-seat-sofa.svg","status":"active"}'::jsonb,
 '{"id":"12c9e509-68fd-551b-a2f8-492945a42e5e","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200003","title":"24-inch monitor","description":"24-inch IPS monitor, 1920 × 1080, 60 Hz, with HDMI and DisplayPort (both cables included). Panel 54 × 32 cm, 54 × 43 cm with the stand. No dead pixels, no scratches. The original box is gone, but I''ll wrap it properly.","price":90,"location":"EPFL · Ecublens","meetingPoint":"Rolex Learning Center","condition":"Very good","dimensions":"24 in · 1920 × 1080 · 54 × 32 cm","pickup":"Pickup by 6 Dec","pickupBy":"2026-12-06","image":"/samples/monitor.svg","status":"reserved"}'::jsonb,
 '{"id":"4c7ca593-fc36-5402-b776-40e0dfbeac73","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200001","title":"Tower fan","description":"Free. Tower fan, 95 cm tall, 3 speeds, oscillates, remote included. A bit loud on speed 3. Ground floor.","price":0,"location":"FMEL Triaudes · Ecublens","meetingPoint":"FMEL Triaudes · outside entrance","condition":"Good","dimensions":"Height 95 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/tower-fan.svg","status":"active"}'::jsonb,
 '{"id":"c09d0448-e14d-5aee-a0e6-f08868e72548","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Reading armchair","description":"Fauteuil vert, très confortable! Velvet-feel fabric, no stains and no smell (I checked, promise). I read in it every evening, so the seat is soft and the back has kept its shape. It''s too big for my new room. Saturday between 10:00 and 16:00 works best.","price":95,"location":"FMEL Vortex · Chavannes","meetingPoint":"FMEL Vortex · outside reception","condition":"Very good","dimensions":"78 × 82 × 90 cm","pickup":"Saturday 10:00-16:00","pickupBy":"","image":"/samples/reading-armchair.svg","status":"active"}'::jsonb,
 '{"id":"6c74b1f9-e711-575a-ab81-bfb08e908fe1","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200002","title":"Bookshelf speakers","description":"A pair of passive bookshelf speakers with seriously nice sound for the money! Wood-look cabinets, 2-way, 8 ohm. I used them with a small amp for two years. One has a little dent on a top corner, which you can only see if you look for it. I''m around the Amphipôle during the week.","price":60,"location":"UNIL · Dorigny","meetingPoint":"UNIL Amphipôle · main entrance","condition":"Good","dimensions":"17 × 24 × 30 cm each","pickup":"Weekend pickup","pickupBy":"","image":"/samples/bookshelf-speakers.svg","status":"active"}'::jsonb,
 '{"id":"1c67a766-26b5-5706-8ac4-acbe17242ccd","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200001","title":"Compact study desk","description":"Small desk. Fits a laptop and a lamp. One drawer. Light wood, some marks on the top. Ground-floor pickup.","price":40,"location":"FMEL Triaudes · Ecublens","meetingPoint":"FMEL Triaudes · outside entrance","condition":"Used","dimensions":"100 × 50 × 74 cm","pickup":"Weekday evenings after 17:00","pickupBy":"","image":"/samples/compact-study-desk.svg","status":"active"}'::jsonb,
 '{"id":"45eb0bfa-90da-50fe-bcf7-96aa97dac950","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Frying pan set","description":"Deux poêles, 24 and 28 cm, fine for induction. The coating is still good, I cook with them every day. I''m leaving, so I''m selling both together. A wooden spatula comes with them!","price":12,"location":"FMEL Bourdonnette · Lausanne","meetingPoint":"FMEL Bourdonnette · outside entrance","condition":"Good","dimensions":"Ø 24 cm and 28 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/frying-pan-set.svg","status":"active"}'::jsonb,
 '{"id":"203fa23b-d6ff-5163-a897-98884e49c865","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200004","title":"Single bed with mattress","description":"Pine bed frame with slats and a 14 cm foam mattress. Mattress is clean and the cover is washable. Third floor, no lift. The frame comes apart; I''ll help carry. Saturday morning.","price":90,"location":"Lausanne · Centre","meetingPoint":"Lausanne-Flon · metro station","condition":"Good","dimensions":"90 × 200 cm","pickup":"Saturday 10:00-14:00","pickupBy":"","image":"/samples/single-bed-frame.svg","status":"active"}'::jsonb,
 '{"id":"cd159a77-7c47-5a11-a2f3-8ad50c9dc31c","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200001","title":"Linear algebra textbook (EPFL)","description":"The textbook for Algèbre linéaire in BA1. Hardcover, no missing pages. Pencil notes in chapters 1-4, easy to erase. At EPFL most days.","price":22,"location":"EPFL · Ecublens","meetingPoint":"Rolex Learning Center","condition":"Good","dimensions":"Hardcover · 24 × 17 cm","pickup":"Lunchtime, Mon-Fri","pickupBy":"","image":"/samples/linear-algebra-textbook.svg","status":"active"}'::jsonb,
 '{"id":"31a43c5f-05ca-514f-a589-b8dcaf906966","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200002","title":"Skis and poles","description":"Skis (165 cm) with bindings, plus poles. Great all-mountain fun! I took them to Les Diablerets and Verbier for three seasons. The bases have a few scratches, but I waxed them in February and the edges are still sharp. The bindings need adjusting to your boots at a ski shop.","price":90,"location":"FMEL Bourdonnette · Lausanne","meetingPoint":"FMEL Bourdonnette · outside entrance","condition":"Used, with marks","dimensions":"Skis 165 cm · poles 120 cm","pickup":"Pickup by 30 Nov","pickupBy":"2026-11-30","image":"/samples/skis-and-poles.svg","status":"reserved"}'::jsonb,
 '{"id":"07e2b5d3-6b28-56d8-acda-0a061d3213d4","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200001","title":"Desk lamp","description":"Black desk lamp with a yellow shade and an adjustable arm. Warm LED bulb included. Works. I''m at EPFL most days, lunch break is fine.","price":15,"location":"EPFL · Ecublens","meetingPoint":"Rolex Learning Center","condition":"Very good","dimensions":"Height 42 cm","pickup":"Lunchtime, Mon-Fri","pickupBy":"","image":"/samples/desk-lamp.svg","status":"active"}'::jsonb,
 '{"id":"75f0b1e8-cebf-5a66-99a0-f7581785a35e","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200003","title":"Open bookshelf","description":"Open wooden bookshelf, 80 × 30 × 180 cm, four shelves with 36 cm clearance each, so A4 folders fit. Each shelf holds about 15 kg. Visible scratches on the left side, and one shelf has a ring from a mug. Already unscrewed and flat for the car; the longest part is 180 cm.","price":55,"location":"EPFL Quartier Nord","meetingPoint":"SwissTech Convention Center","condition":"Used","dimensions":"80 × 30 × 180 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/open-bookshelf.svg","status":"active"}'::jsonb,
 '{"id":"4a7bfabf-fe00-5ca9-b2f2-6d00ec23b5d3","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200001","title":"Electric kettle","description":"Kettle, 1.7 l. Used for one semester, like new. Auto shut-off works.","price":8,"location":"FMEL Atrium · Ecublens","meetingPoint":"FMEL Atrium · outside entrance","condition":"Like new","dimensions":"1.7 l · 2200 W","pickup":"Weekday evenings after 18:00","pickupBy":"","image":"/samples/electric-kettle.svg","status":"active"}'::jsonb,
 '{"id":"0572a21e-17dd-5269-b32e-22f3cdb534ec","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200004","title":"Dining chair","description":"One wooden dining chair. Stable. The red seat pad comes off. Three more available if you want a set.","price":25,"location":"FMEL Bourdonnette · Lausanne","meetingPoint":"FMEL Bourdonnette · outside entrance","condition":"Good","dimensions":"45 × 48 × 82 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/dining-chair.svg","status":"active"}'::jsonb,
 '{"id":"e2562b99-42d3-5f6c-a952-d1a445752e5f","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Plates and mugs","description":"À donner! Eight plates and four mugs, all slightly different, none chipped. Take them all or just a few. Merci!","price":0,"location":"FMEL Vortex · Chavannes","meetingPoint":"FMEL Vortex · outside reception","condition":"Good","dimensions":"8 plates · 4 mugs","pickup":"Flexible pickup","pickupBy":"","image":"/samples/plates-and-mugs.svg","status":"active"}'::jsonb,
 '{"id":"05bc78c5-e7d4-5f37-aa02-c505dfe6c1d6","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200006","title":"Bike helmet","description":"Helmet, size M (54-58 cm). Worn twice, never crashed. I bought the wrong size, sadly. Adjustable dial at the back.","price":15,"location":"EPFL Quartier Nord","meetingPoint":"SwissTech Convention Center","condition":"Like new","dimensions":"Size M · head 54-58 cm","pickup":"Weekday evenings after 18:00","pickupBy":"","image":"/samples/bike-helmet.svg","status":"active"}'::jsonb,
 '{"id":"9b339fed-8891-57d8-b304-3fd713b4e6ca","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200002","title":"Home office desk","description":"Big desk where I wrote my whole Bachelor thesis! Walnut-look top, 140 × 70 cm, black metal legs, plus a white drawer unit with three drawers. Super stable, no wobble even when I typed furiously. It comes apart in about ten minutes, tools included. Wanted: someone who''ll write their thesis on it too.","price":110,"location":"FMEL Atrium · Ecublens","meetingPoint":"FMEL Atrium · outside entrance","condition":"Very good","dimensions":"140 × 70 × 75 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/home-office-desk.svg","status":"active"}'::jsonb,
 '{"id":"0c8c9cee-dc41-5435-b3a1-2790bac72244","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200003","title":"Area rug","description":"Low-pile rug, 160 × 230 cm, blue and red, pile height 8 mm. Vacuumed every week, never wet. It is rolled up (about 20 cm across, 170 cm long), so it fits into any car.","price":40,"location":"FMEL Atrium · Ecublens","meetingPoint":"FMEL Atrium · outside entrance","condition":"Very good","dimensions":"160 × 230 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/area-rug.svg","status":"active"}'::jsonb,
 '{"id":"1fbc10fc-a868-5ba3-9d60-7c7ada98fb86","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200006","title":"Droit des obligations notes (UNIL)","description":"À donner. Printed and highlighted notes for Droit des obligations, 2nd year. Summary sheets inside. Take them.","price":0,"location":"UNIL · Dorigny","meetingPoint":"UNIL Internef · main entrance","condition":"Used, with marks","dimensions":"Printed · about 140 pages","pickup":"Flexible pickup","pickupBy":"","image":"/samples/law-course-notes.svg","status":"active"}'::jsonb,
 '{"id":"1ce6ff75-bdd6-511b-8ede-b9edb6789cd5","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200002","title":"Oil-filled radiator","description":"Winter is coming and this thing saved me from freezing last year! Oil-filled radiator, 2000 W, three heat settings plus a thermostat, on wheels so you can roll it from the desk to the bed. Warms a 15 m² room in about 20 minutes. No smell. Just don''t leave it on while you''re out, obviously.","price":30,"location":"Ecublens · Le Croset","meetingPoint":"Place François Silvant","condition":"Good","dimensions":"Height 62 cm · 2000 W","pickup":"Pickup by 6 Dec","pickupBy":"2026-12-06","image":"/samples/fan-heater.svg","status":"active"}'::jsonb,
 '{"id":"5047439e-f62c-535a-9da3-b2c24ddc9d9c","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200003","title":"Two-door wardrobe","description":"Two-door wardrobe, 100 × 50 × 200 cm. Inside: one hanging rail and three shelves, each 46 cm deep. The right door has a scratch about 20 cm long at handle height, and the bottom corners show wear. The doors close properly. It comes apart into six panels, and the instructions are included.","price":70,"location":"UNIL · Dorigny","meetingPoint":"UNIL Géopolis · main entrance","condition":"Used, with marks","dimensions":"100 × 50 × 200 cm","pickup":"Pickup by 30 Nov","pickupBy":"2026-11-30","image":"/samples/wardrobe.svg","status":"reserved"}'::jsonb,
 '{"id":"601483c7-7db1-5f57-aaa6-9fe61c0ba85f","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200004","title":"Tennis racket","description":"Tennis racket, grip size 3. New grip tape last month. Strings fine. Cover included. Pickup outside the Unithèque.","price":25,"location":"UNIL · Dorigny","meetingPoint":"UNIL Unithèque · main entrance","condition":"Good","dimensions":"Head 645 cm² · 27 in","pickup":"Weekday evenings after 18:00","pickupBy":"","image":"/samples/tennis-racket.svg","status":"active"}'::jsonb,
 '{"id":"6aa20fe2-4d40-5958-aacd-b7054c4ac838","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200004","title":"Storage shelf","description":"White cube shelf, 2 × 4. A bit scuffed at the bottom. Heavier than it looks. A few boxes included if you want them.","price":35,"location":"FMEL Ochettes · Chavannes","meetingPoint":"FMEL Ochettes · outside entrance","condition":"Good","dimensions":"70 × 30 × 150 cm","pickup":"Weekday evenings after 18:00","pickupBy":"","image":"/samples/storage-shelf.svg","status":"active"}'::jsonb,
 '{"id":"928a3996-86c3-54b3-9590-c8b714ae7a14","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Framed prints, set of 3","description":"Trois affiches avec cadres, 30 × 40 cm. I bought them for my room and then moved. Warm colours, perfect above a desk. The glass is clean and the hooks are included.","price":18,"location":"Lausanne · Centre","meetingPoint":"Gare de Lausanne · main hall","condition":"Like new","dimensions":"30 × 40 cm each","pickup":"Flexible pickup","pickupBy":"","image":"/samples/framed-prints.svg","status":"active"}'::jsonb,
 '{"id":"d9ef629d-6eb7-5706-b921-9896c0f9fe9a","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200006","title":"Free spare chair","description":"À donner. Blue chair, used, a bit wobbly on one leg. Take it whenever, just message me.","price":0,"location":"Ecublens · Le Croset","meetingPoint":"Place François Silvant","condition":"Used","dimensions":"45 × 48 × 82 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/free-spare-chair.svg","status":"active"}'::jsonb,
 '{"id":"d7771220-fa24-5cd3-bdd9-d919effc67cb","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200004","title":"Inkjet printer","description":"All-in-one inkjet printer: prints, scans, copies. Wi-Fi works on a good day. Scuffed on top. Cartridges nearly empty, so buy new ones. USB cable included.","price":25,"location":"FMEL Vortex · Chavannes","meetingPoint":"FMEL Vortex · outside reception","condition":"Used, with marks","dimensions":"42 × 35 × 18 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/inkjet-printer.svg","status":"active"}'::jsonb,
 '{"id":"95af934e-c4ed-55eb-8dde-59f64f9f7b27","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200003","title":"Vacuum cleaner","description":"Canister vacuum cleaner, 700 W, bagless with a 1.5 l dust container. Hose 1.8 m, telescopic tube, floor and crevice nozzles included. The filter was cleaned on 10 November and the cable is 5 m long. Runs normally; the right wheel squeaks slightly.","price":40,"location":"FMEL Bourdonnette · Lausanne","meetingPoint":"FMEL Bourdonnette · outside entrance","condition":"Good","dimensions":"Canister · 38 × 26 × 26 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/vacuum-cleaner.svg","status":"active"}'::jsonb,
 '{"id":"6f198d18-8129-5baf-9d0a-a18e46c5b83d","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Living room sofa","description":"Grand canapé jaune moutarde, trois places. The cushions are firm and nothing is broken. Two people needed to carry it, no stairs.","price":220,"location":"FMEL Triaudes · Ecublens","meetingPoint":"FMEL Triaudes · outside entrance","condition":"Good","dimensions":"185 × 90 × 80 cm","pickup":"Weekend pickup","pickupBy":"","image":"/samples/living-room-sofa.svg","status":"reserved"}'::jsonb,
 '{"id":"dce58145-98cf-5f68-8fc5-49db2a7bbc3b","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200005","title":"Yoga mat","description":"Tapis de yoga bleu, 6 mm thick so it''s easy on the knees. Used for a year and cleaned every week. Strap included.","price":10,"location":"Lausanne · Centre","meetingPoint":"Lausanne-Flon · metro station","condition":"Good","dimensions":"183 × 61 cm · 6 mm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/yoga-mat.svg","status":"sold"}'::jsonb,
 '{"id":"928b927f-7bec-5b75-86e6-efcb7be496ab","sellerId":"df5ead21-cb17-52ad-af2d-b6b167200001","title":"Small reading lamp","description":"Small table lamp with a ceramic base and a cream shade. Works.","price":10,"location":"FMEL Vortex · Chavannes","meetingPoint":"FMEL Vortex · outside reception","condition":"Used","dimensions":"Height 38 cm","pickup":"Flexible pickup","pickupBy":"","image":"/samples/small-reading-lamp.svg","status":"sold"}'::jsonb
),
 array(select jsonb_array_elements_text('["FMEL Atrium · outside entrance","FMEL Triaudes · outside entrance","FMEL Vortex · outside reception","FMEL Ochettes · outside entrance","FMEL Bourdonnette · outside entrance","Rolex Learning Center","SwissTech Convention Center","Place François Silvant","UNIL Amphipôle · main entrance","UNIL Internef · main entrance","UNIL Géopolis · main entrance","UNIL Unithèque · main entrance","Lausanne-Flon · metro station","Gare de Lausanne · main hall"]'::jsonb))
);
-- END SHIPPED CATALOG

create function takeover_admin.is_demo_seller(seller uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from auth.users where id=seller and raw_app_meta_data->>'demo_seed'='takeover-demo-v2'
  and encrypted_password is null and email_confirmed_at is null and banned_until='infinity'::timestamptz);
$$;

create or replace function public.validate_listing_photos() returns trigger
language plpgsql security definer set search_path='' as $$
declare photo text;
begin
 foreach photo in array new.images loop
  if photo ~ ('^' || new.owner_id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$') then continue; end if;
  if photo ~ '^/samples/[a-z0-9-]+\.svg$' and new.tags @> array['Demo']
    and takeover_admin.is_demo_seller(new.owner_id) and exists(
      select 1 from takeover_admin.catalog c, jsonb_array_elements(c.listings) l where l->>'image'=photo
    ) then continue; end if;
  raise exception 'Invalid photo path';
 end loop;
 return new;
end $$;
revoke all on function public.validate_listing_photos() from public, anon, authenticated;

update public.listings l set demo_meeting_point=d."meetingPoint"
 from takeover_admin.catalog c,
 jsonb_to_recordset(c.listings) as d(id uuid,"sellerId" uuid,location text,"meetingPoint" text)
 where l.id=d.id and l.owner_id=d."sellerId" and l.location=d.location
  and l.tags @> array['Demo'] and takeover_admin.is_demo_seller(l.owner_id)
  and l.images[1] in (select x->>'image' from jsonb_array_elements(c.listings) x);

create function takeover_admin.check_student(student uuid) returns void
language plpgsql set search_path='' as $$
begin
 -- Serialize a block with a student-originated write.
 perform 1 from auth.users where id=student for share;
 if exists(select 1 from takeover_admin.student_blocks where student_id=student)
 then raise exception 'admin_student_blocked'; end if;
end $$;

create function takeover_admin.check_listing_insert() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform takeover_admin.check_student(new.owner_id);
 return new;
end $$;
create trigger check_listing_moderation before insert on public.listings for each row
 execute function takeover_admin.check_listing_insert();

create function takeover_admin.check_contact() returns trigger
language plpgsql security definer set search_path='' as $$
declare item uuid; actor uuid; hidden boolean;
begin
 if tg_table_name='conversations' then
  item:=new.listing_id; actor:=new.buyer_id;
 else
  select listing_id into item from public.conversations where id=new.conversation_id;
  actor:=new.sender_id;
 end if;
 -- Also covers the messages inserted atomically by deal_action and pickup_action.
 select hidden_at is not null into hidden from public.listings where id=item for share;
 if hidden then raise exception 'admin_listing_hidden'; end if;
 perform takeover_admin.check_student(actor);
 return new;
end $$;
create trigger check_conversation_moderation before insert on public.conversations for each row
 execute function takeover_admin.check_contact();
create trigger check_message_moderation before insert on public.messages for each row
 execute function takeover_admin.check_contact();

create function takeover_admin.require_reason(p jsonb) returns text
language plpgsql immutable set search_path='' as $$
declare reason text:=regexp_replace(p->>'reason','^[[:space:]]+|[[:space:]]+$','','g');
begin
 if jsonb_typeof(p->'reason') is distinct from 'string' or length(reason) not between 1 and 1000
 then raise exception 'admin_invalid_input'; end if;
 return reason;
end $$;

create function takeover_admin.input_uuid(value text) returns uuid
language plpgsql immutable set search_path='' as $$
begin
 if value is null then raise exception 'admin_invalid_input'; end if;
 return value::uuid;
exception when invalid_text_representation then raise exception 'admin_invalid_input';
end $$;

create function takeover_admin.log_action(kind text, target uuid, why text) returns void
language sql set search_path='' as $$
 insert into public.moderation_log(admin_id,action,target_id,reason) values(auth.uid(),kind,target,why);
$$;

create function takeover_admin.require_no_deal(item uuid) returns void
language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.deals where listing_id=item and status='agreed')
 then raise exception 'admin_deal_agreed'; end if;
end $$;

create function takeover_admin.listing_json(l public.listings) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',l.id,'sellerId',l.owner_id,'title',l.title,'description',l.description,
  'price',l.price,'location',l.location,'condition',l.condition,'meetingPoint',l.demo_meeting_point,
  'pickup',l.pickup,'pickupBy',coalesce(l.pickup_by::text,''),'image',coalesce(l.images[1],''),
  'status',l.status,'hidden',l.hidden_at is not null);
$$;

create function takeover_admin.seller_json(s public.profiles) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',s.id,'name',s.display_name,'styleNote',coalesce((select note from takeover_admin.demo_seller_notes where seller_id=s.id),''),
  'listingIds',(select coalesce(jsonb_agg(l.id order by l.created_at,l.id),'[]') from public.listings l
    where l.owner_id=s.id and l.tags @> array['Demo'] and not l.demo_retired));
$$;

create function takeover_admin.create_seller(seller uuid, email_address text, display_name text) returns void
language sql set search_path='' as $$
 insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,banned_until,
   raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(seller,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email_address,null,null,
   'infinity',jsonb_build_object('demo_seed','takeover-demo-v2','synthetic',true),
   jsonb_build_object('display_name',display_name),now(),now())
 on conflict(id) do nothing;
$$;

-- Seed can be run from the SQL Editor. Reset additionally restores changed rows and retires
-- custom listings with chat or report history, so their foreign keys remain valid.
create function takeover_admin.seed_demo_catalog(reset_catalog boolean) returns jsonb
language plpgsql set search_path='' as $$
declare shipped takeover_admin.catalog; seed_seller record;
begin
 perform pg_advisory_xact_lock(561902, 4);
 select * into strict shipped from takeover_admin.catalog;
 if exists(
  select 1 from jsonb_to_recordset(shipped.sellers) as d(id uuid,email text)
  join auth.users u on u.id=d.id or lower(u.email)=d.email
  where u.id<>d.id or u.email is distinct from d.email or not takeover_admin.is_demo_seller(u.id)
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
  pickup_by=excluded.pickup_by,images=excluded.images,status=excluded.status,tags=excluded.tags,
  demo_meeting_point=excluded.demo_meeting_point,hidden_at=null,demo_retired=false
 where reset_catalog;
 return jsonb_build_object('listings',jsonb_array_length(shipped.listings),'sellers',jsonb_array_length(shipped.sellers));
end $$;

create function public.admin_list_demo_listings() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform takeover_admin.require_admin();
 return (select coalesce(jsonb_agg(takeover_admin.listing_json(l) order by l.created_at,l.id),'[]')
  from public.listings l where l.tags @> array['Demo'] and not l.demo_retired and takeover_admin.is_demo_seller(l.owner_id));
end $$;

create function public.admin_save_demo_listing(p jsonb) returns jsonb
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
   location=btrim(p->>'location'),condition=p->>'condition',pickup=p->>'pickup',images=array[p->>'image'],
   status=p->>'status',pickup_by=deadline,demo_meeting_point=p->>'meetingPoint' where id=item returning * into l;
 end if;
 return takeover_admin.listing_json(l);
end $$;

create function public.admin_set_listing_hidden(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item uuid; hidden boolean; why text; current_hidden boolean;
begin
 perform takeover_admin.require_admin();
 item:=takeover_admin.input_uuid(p->>'id');
 why:=takeover_admin.require_reason(p);
 if jsonb_typeof(p->'hidden') is distinct from 'boolean' then raise exception 'admin_invalid_input'; end if;
 hidden:=(p->>'hidden')::boolean;
 select hidden_at is not null into current_hidden from public.listings where id=item and not demo_retired for update;
 if not found then raise exception 'admin_listing_missing'; end if;
 if hidden<>current_hidden then
  if hidden then perform takeover_admin.require_no_deal(item); end if;
  update public.listings set hidden_at=case when hidden then now() end where id=item;
  perform takeover_admin.log_action(case when hidden then 'hide_listing' else 'restore_listing' end,item,why);
 end if;
 return jsonb_build_object('id',item,'hidden',hidden);
end $$;

create function public.admin_reset_demo(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare why text; result jsonb;
begin
 perform takeover_admin.require_admin();
 why:=takeover_admin.require_reason(p);
 result:=takeover_admin.seed_demo_catalog(true);
 perform takeover_admin.log_action('reset_demo',null,why);
 return result;
end $$;

create function public.admin_list_demo_sellers() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform takeover_admin.require_admin();
 return (select coalesce(jsonb_agg(takeover_admin.seller_json(s) order by s.display_name,s.id),'[]')
  from public.profiles s where not s.demo_retired and takeover_admin.is_demo_seller(s.id));
end $$;

create function public.admin_save_demo_seller(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.profiles; seller uuid;
begin
 perform takeover_admin.require_admin();
 perform pg_advisory_xact_lock(561902, 4);
 if jsonb_typeof(p->'name') is distinct from 'string' or length(btrim(p->>'name')) not between 1 and 80
  or jsonb_typeof(p->'styleNote') is distinct from 'string' or length(p->>'styleNote')>1000
 then raise exception 'admin_invalid_input'; end if;
 if not (p ? 'id') then
  seller:=gen_random_uuid();
  perform takeover_admin.create_seller(seller,'takeover-demo-'||seller||'@example.invalid',btrim(p->>'name'));
  insert into public.profiles(id,display_name) values(seller,btrim(p->>'name')) returning * into s;
 else
  seller:=takeover_admin.input_uuid(p->>'id');
  update public.profiles set display_name=btrim(p->>'name')
   where id=seller and not demo_retired and takeover_admin.is_demo_seller(id) returning * into s;
  if not found then raise exception 'admin_seller_missing'; end if;
 end if;
 insert into takeover_admin.demo_seller_notes(seller_id,note) values(seller,p->>'styleNote')
 on conflict(seller_id) do update set note=excluded.note;
 return takeover_admin.seller_json(s);
end $$;

create function public.admin_list_reports() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform takeover_admin.require_admin();
 return (select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'reporterId',r.reporter_id,'reason',r.reason,'createdAt',r.created_at,'resolvedAt',r.resolved_at,
   'studentId',case when takeover_admin.is_demo_seller(l.owner_id) then null else coalesce(l.owner_id,m.sender_id) end,
   'target',case when l.id is not null then jsonb_build_object('kind','listing','id',l.id,'title',l.title,
     'description',l.description,'hidden',l.hidden_at is not null)
    else jsonb_build_object('kind','message','id',m.id,'conversationId',m.conversation_id,'listingId',c.listing_id,'body',m.body)
    end) order by r.resolved_at nulls first,r.created_at desc,r.id),'[]')
  from public.reports r left join public.listings l on l.id=r.listing_id
  left join public.messages m on m.id=r.message_id left join public.conversations c on c.id=m.conversation_id);
end $$;

create function public.admin_resolve_report(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item uuid; why text; resolved timestamptz;
begin
 perform takeover_admin.require_admin();
 item:=takeover_admin.input_uuid(p->>'id');
 why:=takeover_admin.require_reason(p);
 select resolved_at into resolved from public.reports where id=item for update;
 if not found then raise exception 'admin_report_missing'; end if;
 if resolved is null then
  update public.reports set resolved_at=now() where id=item returning resolved_at into resolved;
  perform takeover_admin.log_action('resolve_report',item,why);
 end if;
 return jsonb_build_object('id',item,'resolvedAt',resolved);
end $$;

-- The pre-existing table-wide insert grant must not allow a reporter to choose resolved_at.
revoke insert on public.reports from authenticated;
grant insert(id,reporter_id,listing_id,message_id,reason,created_at) on public.reports to authenticated;

create function public.admin_list_blocks() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform takeover_admin.require_admin();
 return (select coalesce(jsonb_agg(jsonb_build_object('studentId',b.student_id,'name',p.display_name,
   'reason',b.reason,'at',b.created_at) order by b.created_at desc,b.student_id),'[]')
  from takeover_admin.student_blocks b left join public.profiles p on p.id=b.student_id);
end $$;

create function public.admin_set_student_blocked(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare student uuid; blocked boolean; why text;
begin
 perform takeover_admin.require_admin();
 student:=takeover_admin.input_uuid(p->>'studentId');
 why:=takeover_admin.require_reason(p);
 if jsonb_typeof(p->'blocked') is distinct from 'boolean' then raise exception 'admin_invalid_input'; end if;
 blocked:=(p->>'blocked')::boolean;
 perform 1 from auth.users where id=student for no key update;
 if not found or takeover_admin.is_demo_seller(student) then raise exception 'admin_student_missing'; end if;
 if blocked then
  insert into takeover_admin.student_blocks(student_id,reason) values(student,why) on conflict do nothing;
 else
  delete from takeover_admin.student_blocks where student_id=student;
 end if;
 if found then
  perform takeover_admin.log_action(case when blocked then 'block_student' else 'unblock_student' end,student,why);
 end if;
 return jsonb_build_object('studentId',student,'blocked',blocked);
end $$;

create function public.admin_list_moderation_log() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform takeover_admin.require_admin();
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'adminId',admin_id,
   'action',action,'targetId',target_id,'reason',reason,'at',created_at) order by created_at desc,id),'[]')
  from public.moderation_log);
end $$;

create function public.admin_overview() returns jsonb
language plpgsql security definer set search_path='' as $$
declare today date:=(now() at time zone 'UTC')::date;
begin
 perform takeover_admin.require_admin();
 return jsonb_build_object(
  'listings',(select jsonb_build_object(
    'active',count(*) filter(where status='active' and hidden_at is null),
    'reserved',count(*) filter(where status='reserved' and hidden_at is null),
    'sold',count(*) filter(where status='sold' and hidden_at is null),
    'withdrawn',count(*) filter(where status='withdrawn' and hidden_at is null),
    'hidden',count(*) filter(where hidden_at is not null))
   from public.listings where not demo_retired),
  'conversations',(select count(*) from public.conversations),
  'deals',(select jsonb_build_object('open',count(*) filter(where status='open'),
    'agreed',count(*) filter(where status='agreed'),'completed',count(*) filter(where status='completed'),
    'cancelled',count(*) filter(where status='cancelled')) from public.deals),
  'reportsOpen',(select count(*) from public.reports where resolved_at is null),
  'pakoToday',jsonb_build_object(
   'requests',coalesce((select requests from public.ai_daily_totals where day=today),0),
   'threadReads',coalesce((select requests from public.ai_thread_totals where day=today),0)));
end $$;

revoke all on function public.admin_list_demo_listings(),public.admin_save_demo_listing(jsonb),
 public.admin_set_listing_hidden(jsonb),public.admin_reset_demo(jsonb),public.admin_list_demo_sellers(),
 public.admin_save_demo_seller(jsonb),public.admin_list_reports(),public.admin_resolve_report(jsonb),
 public.admin_list_blocks(),public.admin_set_student_blocked(jsonb),public.admin_list_moderation_log(),
 public.admin_overview() from public;
grant execute on function public.admin_list_demo_listings(),public.admin_save_demo_listing(jsonb),
 public.admin_set_listing_hidden(jsonb),public.admin_reset_demo(jsonb),public.admin_list_demo_sellers(),
 public.admin_save_demo_seller(jsonb),public.admin_list_reports(),public.admin_resolve_report(jsonb),
 public.admin_list_blocks(),public.admin_set_student_blocked(jsonb),public.admin_list_moderation_log(),
 public.admin_overview() to anon, authenticated;

commit;
