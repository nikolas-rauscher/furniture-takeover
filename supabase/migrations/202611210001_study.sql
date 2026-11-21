begin;

-- Answers of the user study on the tour page. Students cannot read or write these tables;
-- the server calls the functions below with its service key.
create table takeover_admin.study_sessions (
 id uuid primary key,
 survey text not null check(survey in('v1','v3')),
 version text not null check(version ~ '^[a-z0-9][a-z0-9.-]{0,19}$'),
 -- Empty only for v1 sessions from the client that predates the language switch.
 language text check(language in('en','fr','de')),
 source text not null check(source ~ '^[a-z0-9][a-z0-9-]{0,23}$'),
 device text not null check(device in('phone','desktop')),
 started_at timestamptz not null default now(),
 check(survey='v1' or language is not null)
);
create table takeover_admin.study_answers (
 session uuid not null references takeover_admin.study_sessions(id) on delete cascade,
 step text not null check(step ~ '^[a-z][a-z0-9-]{1,39}$'),
 chosen text[] not null check(cardinality(chosen)<=12),
 -- v3 only: the first answer to the step, kept when the participant changes it later.
 first_chosen text[] check(cardinality(first_chosen)<=12),
 shown text[] not null check(cardinality(shown)<=12),
 text text not null check(length(text)<=280),
 elapsed_ms integer not null check(elapsed_ms between 0 and 3600000),
 -- v3 only: raised by the client with every save of this answer; an older write never replaces a newer one.
 revision integer not null default 0 check(revision between 0 and 100000),
 saved_at timestamptz not null default now(),
 primary key(session,step)
);
create table takeover_admin.study_events (
 session uuid not null references takeover_admin.study_sessions(id) on delete cascade,
 seq integer not null check(seq between 0 and 9999),
 kind text not null check(kind in('shown','answered','skipped','changed','back','scene-played',
  'scene-skipped','moment-tapped','moment-auto','core-complete','end','share','language')),
 step text check(step ~ '^[a-z][a-z0-9-]{1,39}$'),
 detail text check(detail ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
 at timestamptz not null,
 received_at timestamptz not null default now(),
 primary key(session,seq)
);
create table takeover_admin.study_contacts (
 email text primary key check(length(email)<=254 and email=lower(email)),
 pilot boolean not null,
 session uuid references takeover_admin.study_sessions(id) on delete set null,
 created_at timestamptz not null default now()
);
-- The v3 form at the end of the survey has no session column, so it cannot be linked to
-- answers. Role and place are given by those who want to try takeover early, and only by them.
create table takeover_admin.study_pilot (
 email text primary key check(length(email)<=254 and email=lower(email)),
 launch_news boolean not null,
 try_early boolean not null,
 future_surveys boolean not null,
 role text check(role in('seller','buyer','both')),
 place text check(place in('vortex','atrium','triaudes','fmel-other','other-res','flat','elsewhere')),
 created_at timestamptz not null default now(),
 check(launch_news or try_early or future_surveys),
 check(try_early=(role is not null and place is not null))
);
alter table takeover_admin.study_sessions enable row level security;
alter table takeover_admin.study_answers enable row level security;
alter table takeover_admin.study_events enable row level security;
alter table takeover_admin.study_contacts enable row level security;
alter table takeover_admin.study_pilot enable row level security;
revoke all on takeover_admin.study_sessions,takeover_admin.study_answers,takeover_admin.study_events,
 takeover_admin.study_contacts,takeover_admin.study_pilot from public,anon,authenticated;

-- Starting a session twice changes nothing.
create function public.study_start(p_session uuid,p_survey text,p_version text,p_language text,p_source text,p_device text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('takeover_admin.study_sessions'));
 if exists(select 1 from takeover_admin.study_sessions where id=p_session) then return; end if;
 if (select count(*) from takeover_admin.study_sessions)>=5000 then raise exception 'study_session_limit'; end if;
 insert into takeover_admin.study_sessions(id,survey,version,language,source,device)
 values(p_session,p_survey,p_version,p_language,p_source,p_device);
end $$;

-- An answer replaces the earlier answer for the same step, so the participant can go back.
-- The first answer of a v3 step stays as it was first saved. A write with an older revision
-- than the stored one, such as a request still in flight from before a reload, changes nothing.
create function public.study_save_answer(p_session uuid,p_step text,p_chosen text[],p_first_chosen text[],
 p_shown text[],p_text text,p_elapsed_ms integer,p_revision integer default 0)
returns void language plpgsql security definer set search_path='' as $$
declare session_survey text;
begin
 -- The session row serializes the answers of one participant, so the limit below holds.
 select survey into session_survey from takeover_admin.study_sessions where id=p_session for update;
 if not found then raise exception 'study_session_unknown'; end if;
 if (session_survey='v3')<>(p_first_chosen is not null) then raise exception 'study_survey_mismatch'; end if;
 if not exists(select 1 from takeover_admin.study_answers where session=p_session and step=p_step)
  and (select count(*) from takeover_admin.study_answers where session=p_session)>=60
 then raise exception 'study_answer_limit'; end if;
 insert into takeover_admin.study_answers(session,step,chosen,first_chosen,shown,text,elapsed_ms,revision)
 values(p_session,p_step,p_chosen,p_first_chosen,p_shown,p_text,p_elapsed_ms,p_revision)
 on conflict(session,step) do update set chosen=excluded.chosen,shown=excluded.shown,text=excluded.text,
  elapsed_ms=excluded.elapsed_ms,revision=excluded.revision,saved_at=now()
  where excluded.revision>=takeover_admin.study_answers.revision;
end $$;

-- A batch of events: [{seq,kind,step,detail,at}]. An event sent again keeps its first record.
create function public.study_save_events(p_session uuid,p_events jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from takeover_admin.study_sessions where id=p_session for update;
 if not found then raise exception 'study_session_unknown'; end if;
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events) not between 1 and 40
 then raise exception 'study_event_batch'; end if;
 insert into takeover_admin.study_events(session,seq,kind,step,detail,at)
 select p_session,e.seq,e.kind,e.step,e.detail,e.at
 from jsonb_to_recordset(p_events) as e(seq integer,kind text,step text,detail text,at timestamptz)
 on conflict(session,seq) do nothing;
 if (select count(*) from takeover_admin.study_events where session=p_session)>600
 then raise exception 'study_event_limit'; end if;
end $$;

-- One row per address, and the first submission stands: a later one with the same address
-- changes nothing and returns the same, so a caller cannot tell whether an address is listed.
-- A full list refuses every address for the same reason.
create function public.study_save_contact(p_email text,p_pilot boolean,p_session uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('takeover_admin.study_contacts'));
 if p_session is not null and not exists(select 1 from takeover_admin.study_sessions where id=p_session)
 then raise exception 'study_session_unknown'; end if;
 if (select count(*) from takeover_admin.study_contacts)>=2000 then raise exception 'study_contact_limit'; end if;
 insert into takeover_admin.study_contacts(email,pilot,session) values(lower(btrim(p_email)),p_pilot,p_session)
 on conflict(email) do nothing;
end $$;

-- One form per address, and the first one stands, as for the contacts above.
create function public.study_save_pilot(p_email text,p_launch_news boolean,p_try_early boolean,
 p_future_surveys boolean,p_role text,p_place text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('takeover_admin.study_pilot'));
 if (select count(*) from takeover_admin.study_pilot)>=2000 then raise exception 'study_pilot_limit'; end if;
 insert into takeover_admin.study_pilot(email,launch_news,try_early,future_surveys,role,place)
 values(lower(btrim(p_email)),p_launch_news,p_try_early,p_future_surveys,p_role,p_place)
 on conflict(email) do nothing;
end $$;

-- "Remove my answers": the session goes with its answers and events. A second call changes nothing.
create function public.study_withdraw(p_session uuid) returns void
language sql security definer set search_path='' as $$
 delete from takeover_admin.study_sessions where id=p_session;
$$;

-- Counts shown at the end of the v3 survey, over the sessions of one wording version, once 20
-- participants of that version answered the desk task. An empty answer, skipped or emptied by
-- going back, counts as not answered.
create function public.study_results(p_version text) returns jsonb
language sql stable security definer set search_path='' as $$
 with answers as (
  select a.step,a.chosen from takeover_admin.study_answers a
  join takeover_admin.study_sessions s on s.id=a.session
  where s.survey='v3' and s.version=p_version and a.step in('desk','last-trouble')
   and cardinality(a.chosen)>0
 ), tallies as (
  select t.step,jsonb_build_object(
   'answered',(select count(*) from answers a where a.step=t.step),
   'options',coalesce((select jsonb_agg(jsonb_build_object('option',o.option,'count',o.n) order by o.n desc,o.option)
    from (select option,count(*)::int as n from answers a,unnest(a.chosen) as option
     where a.step=t.step group by option) o),'[]'::jsonb)) as tally
  from (values('desk'),('last-trouble')) as t(step)
 )
 select case when (select count(*) from answers where step='desk')>=20
  then jsonb_build_object('ready',true,
   'desk',(select tally from tallies where step='desk'),
   'trouble',(select tally from tallies where step='last-trouble'))
  else jsonb_build_object('ready',false) end;
$$;

-- Rows of the admin results page, for a user the server signed in: no session ids, no emails.
-- The server counts them; anyone not listed in public.admins is refused.
create function public.study_report_rows(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.admins where user_id=p_user) then raise exception 'admin_required'; end if;
 return jsonb_build_object(
  'sessions',coalesce((select jsonb_agg(jsonb_build_object(
    'version',s.version,
    'day',to_char(s.started_at at time zone 'UTC','YYYY-MM-DD'),
    'source',s.source,
    'shown',coalesce((select jsonb_agg(distinct e.step) from takeover_admin.study_events e
     where e.session=s.id and e.kind='shown' and e.step is not null),'[]'::jsonb),
    'lastShown',(select e.step from takeover_admin.study_events e
     where e.session=s.id and e.kind='shown' order by e.seq desc limit 1),
    'completed',exists(select 1 from takeover_admin.study_events e where e.session=s.id and e.kind='core-complete'),
    'ended',exists(select 1 from takeover_admin.study_events e where e.session=s.id and e.kind='end')))
   from takeover_admin.study_sessions s where s.survey='v3'),'[]'::jsonb),
  'answers',coalesce((select jsonb_agg(jsonb_build_object(
    'version',s.version,'step',a.step,'chosen',to_jsonb(a.chosen),'text',a.text))
   from takeover_admin.study_answers a join takeover_admin.study_sessions s on s.id=a.session
   where s.survey='v3'),'[]'::jsonb),
  'pilot',coalesce((select jsonb_agg(jsonb_build_object(
    'launchNews',p.launch_news,'tryEarly',p.try_early,'futureSurveys',p.future_surveys,
    'role',p.role,'place',p.place))
   from takeover_admin.study_pilot p),'[]'::jsonb));
end $$;

revoke all on function public.study_start(uuid,text,text,text,text,text),
 public.study_save_answer(uuid,text,text[],text[],text[],text,integer,integer),
 public.study_save_events(uuid,jsonb),
 public.study_save_contact(text,boolean,uuid),
 public.study_save_pilot(text,boolean,boolean,boolean,text,text),
 public.study_withdraw(uuid),
 public.study_results(text),
 public.study_report_rows(uuid) from public,anon,authenticated;
grant execute on function public.study_start(uuid,text,text,text,text,text),
 public.study_save_answer(uuid,text,text[],text[],text[],text,integer,integer),
 public.study_save_events(uuid,jsonb),
 public.study_save_contact(text,boolean,uuid),
 public.study_save_pilot(text,boolean,boolean,boolean,text,text),
 public.study_withdraw(uuid),
 public.study_results(text),
 public.study_report_rows(uuid) to service_role;

commit;
