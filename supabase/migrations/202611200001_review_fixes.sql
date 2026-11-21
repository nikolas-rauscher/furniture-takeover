begin;

drop trigger sync_deals_with_listing on public.listings;
drop function public.sync_deals_with_listing();

create function takeover_admin.check_listing_update() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.owner_id=auth.uid() then
  perform takeover_admin.check_student(old.owner_id);
 end if;
 -- Deal actions close the agreement and save its message before updating the listing.
 if new.status<>old.status and new.status<>'reserved' and exists(
  select 1 from public.deals where listing_id=old.id and status='agreed'
 ) then raise exception 'listing_deal_agreed'; end if;
 return new;
end $$;
create trigger check_listing_update_moderation before update on public.listings
 for each row execute function takeover_admin.check_listing_update();

alter function public.deal_action(uuid,uuid,text,text,jsonb,integer,text) set schema takeover_admin;
alter function public.pickup_action(uuid,uuid,text,text,integer,jsonb,integer,text,uuid) set schema takeover_admin;
revoke all on function takeover_admin.deal_action(uuid,uuid,text,text,jsonb,integer,text),
 takeover_admin.pickup_action(uuid,uuid,text,text,integer,jsonb,integer,text,uuid) from public,anon,authenticated;

create function public.deal_action(p_conversation uuid, p_message uuid, p_body text, p_action text,
 p_terms jsonb default null, p_expected_version integer default 0, p_reason text default null)
returns public.deals language plpgsql security definer set search_path='' as $$
begin
 -- The message trigger checks again under a lock for writes. This also covers receipt retries.
 if exists(select 1 from takeover_admin.student_blocks where student_id=auth.uid())
 then raise exception 'admin_student_blocked'; end if;
 return takeover_admin.deal_action(p_conversation,p_message,p_body,p_action,p_terms,p_expected_version,p_reason);
end $$;

create function public.pickup_action(p_conversation uuid, p_message uuid, p_body text, p_action text,
 p_expected_version integer, p_terms jsonb default null, p_minutes integer default null,
 p_reason text default null, p_released_conversation uuid default null)
returns public.deals language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from takeover_admin.student_blocks where student_id=auth.uid())
 then raise exception 'admin_student_blocked'; end if;
 return takeover_admin.pickup_action(p_conversation,p_message,p_body,p_action,p_expected_version,
  p_terms,p_minutes,p_reason,p_released_conversation);
end $$;

revoke all on function public.deal_action(uuid,uuid,text,text,jsonb,integer,text),
 public.pickup_action(uuid,uuid,text,text,integer,jsonb,integer,text,uuid) from public,anon;
grant execute on function public.deal_action(uuid,uuid,text,text,jsonb,integer,text),
 public.pickup_action(uuid,uuid,text,text,integer,jsonb,integer,text,uuid) to authenticated;

create or replace function public.delete_account() returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); reservations uuid[];
begin
 if actor is null then raise exception 'Sign in to delete your account'; end if;
 if exists(select 1 from takeover_admin.student_blocks where student_id=actor)
 then raise exception 'admin_student_blocked'; end if;
 -- Take the listing locks before the student lock, in the same order as deal actions.
 perform l.id from public.listings l where l.owner_id=actor or exists(
  select 1 from public.conversations c where c.listing_id=l.id and c.buyer_id=actor
 ) order by l.id for update of l;
 perform 1 from auth.users where id=actor for no key update;
 perform takeover_admin.check_student(actor);
 reservations:=array(
  select l.id from public.listings l join public.deals d on d.listing_id=l.id
   where d.buyer_id=actor and d.status='agreed' and l.status='reserved'
 );
 if exists(select 1 from storage.objects where bucket_id='listing-photos' and (storage.foldername(name))[1]=actor::text)
 then raise exception 'Remove your uploaded photos before deleting the account'; end if;
 delete from public.conversation_archives where conversation_id in(select id from public.conversations where actor in(buyer_id,seller_id));
 delete from public.messages where conversation_id in(select id from public.conversations where actor in(buyer_id,seller_id));
 delete from public.conversations where actor in(buyer_id,seller_id);
 update public.listings set status='active' where id=any(reservations) and status='reserved';
 delete from public.listings where owner_id=actor;
 delete from auth.users where id=actor;
end $$;

revoke all on function public.ai_quota(boolean),public.ai_thread_quota(boolean) from public,anon,authenticated;

create function public.ai_quota_spend(p_user uuid,p_kind text,p_spend boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 today date:=(now() at time zone 'UTC')::date;
 resets timestamptz:=(today+1)::timestamp at time zone 'UTC';
 usage_table text;
 totals_table text;
 user_limit integer;
 project_limit integer;
 used integer;
 total integer;
 allowed boolean;
begin
 if p_user is null then raise exception 'sign_in_required'; end if;
 perform takeover_admin.check_student(p_user);
 case p_kind
  when 'marketplace' then
   usage_table:='ai_daily_usage'; totals_table:='ai_daily_totals';
   user_limit:=50; project_limit:=500;
  when 'thread' then
   usage_table:='ai_thread_usage'; totals_table:='ai_thread_totals';
   user_limit:=150; project_limit:=1500;
  else raise exception 'quota_kind_invalid';
 end case;
 if p_spend then
  execute format('insert into public.%I(day,requests) values($1,0) on conflict do nothing',totals_table) using today;
  -- Lock the shared row so concurrent reservations cannot overdraw either limit.
  execute format('select requests from public.%I where day=$1 for update',totals_table) into total using today;
 else
  execute format('select requests from public.%I where day=$1',totals_table) into total using today;
 end if;
 execute format('select requests from public.%I where day=$1 and user_id=$2',usage_table) into used using today,p_user;
 total:=coalesce(total,0);
 used:=coalesce(used,0);
 allowed:=used<user_limit and total<project_limit;
 if p_spend and allowed then
  execute format('insert into public.%I as usage(day,user_id,requests) values($1,$2,1)
   on conflict(day,user_id) do update set requests=usage.requests+1',usage_table) using today,p_user;
  execute format('update public.%I set requests=requests+1 where day=$1',totals_table) using today;
  used:=used+1;
  total:=total+1;
 end if;
 return jsonb_build_object('allowed',allowed,'limit',user_limit,
  'remaining',greatest(0,least(user_limit-used,project_limit-total)),'resetAt',resets);
end $$;
revoke all on function public.ai_quota_spend(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.ai_quota_spend(uuid,text,boolean) to service_role;

revoke execute on function public.admin_list_demo_listings(),public.admin_save_demo_listing(jsonb),
 public.admin_set_listing_hidden(jsonb),public.admin_reset_demo(jsonb),public.admin_list_demo_sellers(),
 public.admin_save_demo_seller(jsonb),public.admin_list_reports(),public.admin_resolve_report(jsonb),
 public.admin_list_blocks(),public.admin_set_student_blocked(jsonb),public.admin_list_moderation_log(),
 public.admin_overview() from anon;

commit;
