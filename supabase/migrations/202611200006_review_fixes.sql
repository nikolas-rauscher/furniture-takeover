begin;

-- A pickup the buyer reported collected never expires and cannot be cancelled; only the seller closes it.
create or replace function takeover_admin.deal_action(p_conversation uuid, p_message uuid, p_body text, p_action text,
 p_terms jsonb default null, p_expected_version integer default 0, p_reason text default null)
returns public.deals language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 c public.conversations;
 d public.deals;
 m public.messages;
 me text;
 availability text;
 kind text;
begin
 if actor is null then raise exception 'sign_in_required'; end if;
 select * into c from public.conversations where id=p_conversation;
 if not found or actor not in(c.buyer_id,c.seller_id) then raise exception 'conversation_unavailable'; end if;
 me:=case when actor=c.buyer_id then 'buyer' else 'seller' end;
 p_body:=regexp_replace(p_body,'^[[:space:]]+|[[:space:]]+$','','g');
 if p_body is null or length(p_body) not between 1 and 4000 or p_message is null then raise exception 'message_invalid'; end if;
 -- Serialize competing buyers and concurrent retries before checking the message receipt.
 select status into availability from public.listings where id=c.listing_id for update;
 select * into m from public.messages where id=p_message;
 if found then
   if m.sender_id<>actor or m.conversation_id<>p_conversation or m.body<>p_body or not exists(select 1 from public.deal_events where message_id=p_message)
   then raise exception 'message_conflict'; end if;
   select * into strict d from public.deals where conversation_id=p_conversation;
   return d;
 end if;
 insert into public.deals(conversation_id,listing_id,buyer_id,seller_id) values(c.id,c.listing_id,c.buyer_id,c.seller_id) on conflict do nothing;
 select * into strict d from public.deals where conversation_id=c.id for update;
 if d.version is distinct from p_expected_version then raise exception 'deal_changed'; end if;
 if d.status='cancelled' and p_action='propose' then
  if availability is distinct from 'active' then raise exception 'listing_unavailable'; end if;
  d.status:='open'; d.outcome:=null; d.outcome_by:=null;
  d.agreed:=null; d.agreed_at:=null; d.pickup_at:=null;
  d.buyer_on_way_at:=null; d.seller_on_way_at:=null;
  d.late_minutes:=null; d.late_by:=null; d.late_at:=null;
  d.buyer_picked_up_at:=null; d.no_show_by:=null; d.no_show_at:=null;
  d.pickup_cancel_reason:=null; d.pickup_checked_at:=null;
 end if;
 if d.status in ('completed','cancelled') or
   (d.status='agreed' and p_action not in ('cancel','complete_shipping')) then raise exception 'deal_closed'; end if;
 if p_action='cancel' and d.status<>'agreed' then raise exception 'deal_not_agreed'; end if;
 if p_action in ('propose','accept') then
   if jsonb_typeof(p_terms) is distinct from 'object' or public.valid_deal_terms(p_terms) is not true then raise exception 'terms_invalid'; end if;
   if p_terms->>'pickup_at' is not null then
     begin
       perform (p_terms->>'pickup_at')::timestamptz;
     exception when invalid_datetime_format or datetime_field_overflow then
       raise exception 'terms_invalid';
     end;
   end if;
   if availability<>'active' then raise exception 'listing_unavailable'; end if;
   if public.body_states_terms(p_body,p_terms) is not true then raise exception 'terms_not_stated'; end if;
 end if;
 case p_action
 when 'propose' then
   kind:='proposed'; d.proposal:=p_terms; d.proposal_by:=me;
 when 'accept' then
   if d.proposal_by is null or d.proposal_by=me or d.proposal is distinct from p_terms then raise exception 'deal_changed'; end if;
   if public.complete_deal_terms(p_terms) is not true then raise exception 'terms_incomplete'; end if;
   d.pickup_at:=(p_terms->>'pickup_at')::timestamptz;
   if p_terms->>'fulfillment'='pickup' and d.pickup_at<=now() then raise exception 'pickup_time_past'; end if;
   kind:='accepted'; d.agreed:=p_terms; d.agreed_at:=now(); d.status:='agreed';
 when 'withdraw','decline' then
   if d.proposal_by is null or (me=d.proposal_by)<>(p_action='withdraw') then raise exception 'deal_changed'; end if;
   kind:=case when p_action='withdraw' then 'withdrawn' else 'declined' end;
 when 'complete_shipping' then
   if me<>'seller' or d.status<>'agreed' or d.agreed->>'fulfillment' is distinct from 'shipping'
     then raise exception 'shipping_unavailable'; end if;
   if availability is distinct from 'reserved' then raise exception 'listing_unavailable'; end if;
   kind:='completed'; d.status:='completed'; d.outcome:='shipped'; d.outcome_by:=me;
 when 'cancel' then
   if d.buyer_picked_up_at is not null then raise exception 'pickup_collected'; end if;
   if d.pickup_at is not null and clock_timestamp() >= d.pickup_at + interval '48 hours'
     then raise exception 'pickup_unavailable'; end if;
   if p_reason is null or p_reason not in('changed_mind','cant_make_it') then raise exception 'reason_invalid'; end if;
   kind:='cancelled'; d.status:='cancelled'; d.outcome:='cancelled'; d.outcome_by:=me;
 else raise exception 'action_invalid';
 end case;
 insert into public.messages(id,conversation_id,sender_id,body) values(p_message,c.id,actor,p_body);
 if kind='proposed' then d.proposal_message_id:=p_message;
 else d.proposal:=null; d.proposal_by:=null; d.proposal_message_id:=null; end if;
 update public.deals set status=d.status,proposal=d.proposal,proposal_by=d.proposal_by,proposal_message_id=d.proposal_message_id,
 agreed=d.agreed,agreed_at=d.agreed_at,pickup_at=d.pickup_at,outcome=d.outcome,outcome_by=d.outcome_by,
 buyer_on_way_at=d.buyer_on_way_at,seller_on_way_at=d.seller_on_way_at,
 late_minutes=d.late_minutes,late_by=d.late_by,late_at=d.late_at,buyer_picked_up_at=d.buyer_picked_up_at,
 no_show_by=d.no_show_by,no_show_at=d.no_show_at,pickup_cancel_reason=d.pickup_cancel_reason,
 pickup_checked_at=d.pickup_checked_at,version=d.version+1,updated_at=now()
 where conversation_id=c.id returning * into d;
 insert into public.deal_events(conversation_id,actor_role,kind,terms,message_id)
 values(c.id,me,kind,case when kind in ('proposed','accepted') then p_terms end,p_message);
 if kind='accepted' then
   update public.listings set status='reserved' where id=c.listing_id;
   with cleared as (
    update public.deals set proposal=null,proposal_by=null,proposal_message_id=null,version=version+1,updated_at=now()
    where listing_id=c.listing_id and status='open' and proposal is not null returning conversation_id)
   insert into public.deal_events(conversation_id,kind) select conversation_id,'superseded' from cleared;
 elsif kind='completed' then
   update public.listings set status='sold' where id=c.listing_id;
 elsif kind='cancelled' then
   update public.listings set status='active' where id=c.listing_id and status='reserved';
 end if;
 return d;
end $$;

create or replace function takeover_admin.pickup_action(
  p_conversation uuid, p_message uuid, p_body text, p_action text,
  p_expected_version integer, p_terms jsonb default null, p_minutes integer default null,
  p_reason text default null, p_released_conversation uuid default null
)
returns public.deals
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.conversations;
  d public.deals;
  m public.messages;
  me text;
  availability text;
  event_kind text;
  status_change text;
  new_pickup_at timestamptz;
  at_time timestamptz;
  -- The signal and no-show windows match shared/dealConfig.ts.
  signal_before constant interval := interval '180 minutes';
  signal_after constant interval := interval '60 minutes';
  no_show_after constant interval := interval '15 minutes';
begin
  if actor is null then raise exception 'sign_in_required'; end if;
  select * into c from public.conversations where id = p_conversation;
  if not found or actor not in (c.buyer_id, c.seller_id) then
    raise exception 'conversation_unavailable';
  end if;
  me := case when actor = c.buyer_id then 'buyer' else 'seller' end;
  p_body := regexp_replace(p_body, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if p_body is null or length(p_body) not between 1 and 4000 or p_message is null then
    raise exception 'message_invalid';
  end if;

  -- Use the same lock order as deal_action and manual listing updates.
  select status into availability from public.listings where id = c.listing_id for update;
  select * into m from public.messages where id = p_message;
  if found then
    if m.sender_id <> actor or m.conversation_id <> p_conversation or m.body <> p_body
      or not exists (select 1 from public.deal_events where message_id = p_message and kind in (
        'time_suggested', 'time_accepted', 'time_kept', 'time_withdrawn', 'on_my_way',
        'late', 'no_show', 'no_show_released', 'pickup_cancelled', 'picked_up', 'offered_again'
      ))
    then raise exception 'message_conflict'; end if;
    select * into strict d from public.deals where conversation_id = c.id;
    return d;
  end if;
  insert into public.deals(conversation_id, listing_id, buyer_id, seller_id)
    values (c.id, c.listing_id, c.buyer_id, c.seller_id) on conflict do nothing;
  select * into strict d from public.deals where conversation_id = c.id for update;
  if d.version is distinct from p_expected_version then raise exception 'deal_changed'; end if;
  at_time := clock_timestamp();

  if p_action = 'offer_again' then
    if d.status = 'cancelled' and d.agreed is null then
      d.status := 'open';
      d.outcome := null;
      d.outcome_by := null;
    end if;
    if me <> 'seller' or d.status <> 'open' or not exists (
      select 1 from public.messages where conversation_id = c.id and sender_id = c.buyer_id
    ) or not exists (
      select 1 from public.deals released
      where released.conversation_id = p_released_conversation
        and released.conversation_id <> c.id and released.listing_id = c.listing_id
        and released.seller_id = actor and released.status = 'cancelled'
        and released.outcome in ('no_show', 'cancelled', 'pickup_expired')
        and released.agreed->>'fulfillment' = 'pickup'
    ) then raise exception 'next_buyer_unavailable'; end if;
    if availability is distinct from 'active' then raise exception 'listing_unavailable'; end if;
  else
    if d.status <> 'agreed' or d.agreed->>'fulfillment' is distinct from 'pickup' or d.pickup_at is null then
      raise exception 'pickup_unavailable';
    end if;
    if availability is distinct from 'reserved' then raise exception 'listing_unavailable'; end if;
    if at_time >= d.pickup_at + interval '48 hours' and d.buyer_picked_up_at is null then
      raise exception 'pickup_unavailable';
    end if;
    if d.buyer_picked_up_at is not null and not (
      (p_action = 'picked_up' and me = 'seller')
      or p_action in ('confirm_pickup_happened', 'keep_time', 'withdraw_time')
    ) then raise exception 'pickup_collected'; end if;
  end if;
  if p_action in ('confirm_pickup_happened', 'release_stale_pickup') and
    at_time < d.pickup_at + interval '24 hours' then raise exception 'pickup_check_not_due'; end if;

  if p_action in ('suggest_time', 'accept_time') then
    if jsonb_typeof(p_terms) is distinct from 'object' or public.valid_deal_terms(p_terms) is not true then
      raise exception 'terms_invalid';
    end if;
    if public.complete_deal_terms(p_terms) is not true then raise exception 'terms_incomplete'; end if;
    begin
      new_pickup_at := (p_terms->>'pickup_at')::timestamptz;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'terms_invalid';
    end;
    if p_terms->>'fulfillment' <> 'pickup' or p_terms->'amount' is distinct from d.agreed->'amount'
      or p_terms->>'pickup_point' is distinct from d.agreed->>'pickup_point'
      or new_pickup_at = d.pickup_at then raise exception 'pickup_terms_changed'; end if;
    if new_pickup_at <= at_time then raise exception 'pickup_time_past'; end if;
    if public.body_states_terms(p_body, p_terms) is not true then raise exception 'terms_not_stated'; end if;
    if d.proposal_by <> me and d.proposal = p_terms then p_action := 'accept_time'; end if;
  end if;
  if p_action in ('on_my_way', 'late') then
    if at_time < d.pickup_at - signal_before then raise exception 'too_early'; end if;
    if at_time > d.pickup_at + signal_after then raise exception 'pickup_window_ended'; end if;
  end if;
  if p_action = 'picked_up' and me = 'seller' and at_time < d.pickup_at
    and d.buyer_picked_up_at is null then
    raise exception 'too_early';
  end if;
  if p_action in ('no_show', 'release_no_show')
    and at_time < d.pickup_at + coalesce(d.late_minutes, 0) * interval '1 minute' + no_show_after then
    raise exception 'too_early';
  end if;

  case p_action
    when 'suggest_time' then
      event_kind := 'time_suggested';
      d.proposal := p_terms;
      d.proposal_by := me;
      d.proposal_message_id := p_message;
    when 'accept_time' then
      if d.proposal_by is null or d.proposal_by = me or d.proposal is distinct from p_terms then
        raise exception 'deal_changed';
      end if;
      event_kind := 'time_accepted';
      d.agreed := p_terms;
      d.agreed_at := at_time;
      d.pickup_at := new_pickup_at;
      d.buyer_on_way_at := null;
      d.seller_on_way_at := null;
      d.late_minutes := null;
      d.late_by := null;
      d.late_at := null;
      d.buyer_picked_up_at := null;
      d.no_show_by := null;
      d.no_show_at := null;
      d.pickup_checked_at := null;
    when 'keep_time', 'withdraw_time' then
      if d.proposal_by is null or (d.proposal_by = me) <> (p_action = 'withdraw_time') then
        raise exception 'deal_changed';
      end if;
      event_kind := case when p_action = 'keep_time' then 'time_kept' else 'time_withdrawn' end;
    when 'on_my_way' then
      event_kind := 'on_my_way';
      if me = 'buyer' then d.buyer_on_way_at := at_time;
      else d.seller_on_way_at := at_time; end if;
    when 'late' then
      if p_minutes is null or p_minutes not in (10, 20, 30) then raise exception 'minutes_invalid'; end if;
      event_kind := 'late';
      d.late_minutes := p_minutes;
      d.late_by := me;
      d.late_at := at_time;
    when 'no_show' then
      event_kind := 'no_show';
      d.no_show_by := me;
      d.no_show_at := at_time;
    when 'release_no_show', 'cancel_pickup', 'release_stale_pickup' then
      if p_action = 'cancel_pickup' and p_reason is distinct from 'cant_make_it' then
        raise exception 'reason_invalid';
      end if;
      event_kind := case when p_action = 'release_no_show' then 'no_show_released' else 'pickup_cancelled' end;
      d.pickup_cancel_reason := case when p_action = 'release_no_show' then 'no_show' when p_action = 'cancel_pickup' then p_reason end;
      d.status := 'cancelled';
      d.outcome := case when p_action = 'release_no_show' then 'no_show' else 'cancelled' end;
      d.outcome_by := me;
      status_change := 'active';
    when 'confirm_pickup_happened' then
      event_kind := 'picked_up';
      d.status := 'completed';
      d.outcome := 'picked_up';
      d.outcome_by := me;
      status_change := 'sold';
    when 'picked_up' then
      event_kind := 'picked_up';
      if me = 'buyer' then d.buyer_picked_up_at := at_time;
      else
        d.status := 'completed';
        d.outcome := 'picked_up';
        d.outcome_by := me;
        status_change := 'sold';
      end if;
    when 'offer_again' then event_kind := 'offered_again';
    else raise exception 'action_invalid';
  end case;

  if p_action in ('keep_time', 'withdraw_time', 'accept_time') or status_change is not null then
    d.proposal := null;
    d.proposal_by := null;
    d.proposal_message_id := null;
  end if;
  -- The existing blocking trigger also applies to these messages.
  begin
    insert into public.messages(id, conversation_id, sender_id, body)
      values (p_message, c.id, actor, p_body);
  exception when unique_violation then
    raise exception 'message_conflict';
  end;
  update public.deals set status = d.status, version = d.version + 1, updated_at = at_time,
    proposal = d.proposal, proposal_by = d.proposal_by, proposal_message_id = d.proposal_message_id,
    agreed = d.agreed, agreed_at = d.agreed_at, pickup_at = d.pickup_at,
    outcome = d.outcome, outcome_by = d.outcome_by,
    buyer_on_way_at = d.buyer_on_way_at, seller_on_way_at = d.seller_on_way_at,
    late_minutes = d.late_minutes, late_by = d.late_by, late_at = d.late_at,
    buyer_picked_up_at = d.buyer_picked_up_at, no_show_by = d.no_show_by, no_show_at = d.no_show_at,
    pickup_cancel_reason = d.pickup_cancel_reason, pickup_checked_at = d.pickup_checked_at
    where conversation_id = c.id returning * into d;
  insert into public.deal_events(conversation_id, actor_role, kind, terms, message_id, pickup_minutes)
    values (c.id, me, event_kind,
      case when event_kind in ('time_suggested', 'time_accepted') then p_terms end, p_message,
      case when p_action = 'late' then p_minutes end);
  if status_change is not null then
    update public.listings set status = status_change where id = c.listing_id;
  end if;
  return d;
end $$;

create or replace function public.refresh_pickup_checks(p_catalog boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  at_time timestamptz := statement_timestamp();
  listing uuid;
  d public.deals;
  opens_at timestamptz;
  expires_at timestamptz;
begin
  if actor is null then raise exception 'sign_in_required'; end if;
  for listing in
    select l.id from public.listings l join public.deals pending on pending.listing_id=l.id
    where (actor in (pending.buyer_id,pending.seller_id)
      or (p_catalog and pending.pickup_at <= at_time - interval '48 hours'))
      and l.status='reserved'
      and pending.status='agreed' and pending.agreed->>'fulfillment'='pickup'
      and pending.pickup_at <= at_time - interval '24 hours'
      and (pending.pickup_checked_at is null
        or (pending.pickup_at <= at_time - interval '48 hours' and pending.buyer_picked_up_at is null))
      and not (actor=l.owner_id and exists (
        select 1 from takeover_admin.student_blocks b where b.student_id=actor
      ))
    order by l.id for update of l
  loop
    select * into d from public.deals where listing_id=listing and status='agreed' for update;
    if not found or d.agreed->>'fulfillment'<>'pickup' or d.pickup_at is null then continue; end if;
    opens_at := d.pickup_at + interval '24 hours';
    expires_at := d.pickup_at + interval '48 hours';
    if at_time < opens_at or (actor not in (d.buyer_id,d.seller_id)
      and (p_catalog is not true or at_time < expires_at)) then continue; end if;
    if d.pickup_checked_at is null then
      update public.deals set pickup_checked_at=opens_at where conversation_id=d.conversation_id;
      insert into public.deal_events(conversation_id,kind,created_at)
        values(d.conversation_id,'pickup_check_due',opens_at);
    end if;
    if at_time >= expires_at and d.buyer_picked_up_at is null then
      update public.deals set status='cancelled',outcome='pickup_expired',outcome_by=null,
        proposal=null,proposal_by=null,proposal_message_id=null,version=version+1,updated_at=expires_at
        where conversation_id=d.conversation_id;
      insert into public.deal_events(conversation_id,kind,created_at)
        values(d.conversation_id,'pickup_expired',expires_at);
      update public.listings set status='active' where id=listing and status='reserved';
    end if;
  end loop;
end $$;

-- A departing buyer releases only reservations they have not reported collected.
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
   where d.buyer_id=actor and d.status='agreed' and l.status='reserved' and d.buyer_picked_up_at is null
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

-- The client asks before removing photos, so a refused deletion leaves the listings intact.
create function public.check_account_deletion() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to delete your account'; end if;
 perform takeover_admin.check_student(auth.uid());
end $$;
revoke all on function public.check_account_deletion() from public,anon;
grant execute on function public.check_account_deletion() to authenticated;

-- The inbox reads each visible conversation's newest message, so a busy thread cannot crowd out another.
create function public.inbox_latest_messages() returns setof public.messages
language sql stable set search_path='' as $$
 select m.* from public.conversations c
 cross join lateral (
  select * from public.messages where conversation_id=c.id
  order by created_at desc, id desc limit 1
 ) m
$$;
revoke all on function public.inbox_latest_messages() from public,anon;
grant execute on function public.inbox_latest_messages() to authenticated;

commit;
