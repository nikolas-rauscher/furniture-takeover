begin;

alter table public.deals
  add column buyer_on_way_at timestamptz,
  add column seller_on_way_at timestamptz,
  add column late_minutes smallint check (late_minutes in (10, 20, 30)),
  add column late_by text check (late_by in ('buyer', 'seller')),
  add column late_at timestamptz,
  add column buyer_picked_up_at timestamptz,
  add column no_show_by text check (no_show_by in ('buyer', 'seller')),
  add column no_show_at timestamptz,
  add column pickup_cancel_reason text check (pickup_cancel_reason in ('cant_make_it', 'no_show'));

alter table public.deal_events
  add column pickup_minutes smallint check (pickup_minutes in (10, 20, 30)),
  drop constraint deal_events_kind_check,
  add constraint deal_events_kind_check check (kind in (
    'proposed', 'accepted', 'declined', 'withdrawn', 'cancelled', 'superseded',
    'listing_reopened', 'completed', 'late', 'on_my_way', 'picked_up', 'no_show',
    'time_suggested', 'time_accepted', 'time_kept', 'time_withdrawn',
    'no_show_released', 'pickup_cancelled', 'offered_again'
  ));

-- Keep the original deal RPC available to existing clients.
create function public.pickup_action(
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
    if me <> 'seller' or d.status <> 'open' or not exists (
      select 1 from public.messages where conversation_id = c.id and sender_id = c.buyer_id
    ) or not exists (
      select 1 from public.deals released
      where released.conversation_id = p_released_conversation
        and released.conversation_id <> c.id and released.listing_id = c.listing_id
        and released.seller_id = actor and released.status = 'cancelled'
        and released.outcome in ('no_show', 'cancelled')
        and released.agreed->>'fulfillment' = 'pickup'
    ) then raise exception 'next_buyer_unavailable'; end if;
    if availability is distinct from 'active' then raise exception 'listing_unavailable'; end if;
  else
    if d.status <> 'agreed' or d.agreed->>'fulfillment' is distinct from 'pickup' or d.pickup_at is null then
      raise exception 'pickup_unavailable';
    end if;
    if availability is distinct from 'reserved' then raise exception 'listing_unavailable'; end if;
  end if;

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
  if p_action in ('no_show', 'release_no_show') and at_time < d.pickup_at + no_show_after then
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
    when 'release_no_show', 'cancel_pickup' then
      if p_action = 'cancel_pickup' and p_reason is distinct from 'cant_make_it' then
        raise exception 'reason_invalid';
      end if;
      event_kind := case when p_action = 'release_no_show' then 'no_show_released' else 'pickup_cancelled' end;
      d.pickup_cancel_reason := case when p_action = 'release_no_show' then 'no_show' else p_reason end;
      d.status := 'cancelled';
      d.outcome := case when p_action = 'release_no_show' then 'no_show' else 'cancelled' end;
      d.outcome_by := me;
      status_change := 'active';
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
    pickup_cancel_reason = d.pickup_cancel_reason
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

revoke all on function public.pickup_action(uuid, uuid, text, text, integer, jsonb, integer, text, uuid) from public;
grant execute on function public.pickup_action(uuid, uuid, text, text, integer, jsonb, integer, text, uuid) to authenticated;

commit;
