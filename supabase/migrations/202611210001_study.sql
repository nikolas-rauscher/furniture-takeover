begin;

-- Answers of the user study on the tour page. Students cannot read or write these tables;
-- the server calls the three functions below with its service key.
create table takeover_admin.study_sessions (
 id uuid primary key,
 version text not null check(version ~ '^[a-z0-9][a-z0-9.-]{0,19}$'),
 source text not null check(source ~ '^[a-z0-9][a-z0-9-]{0,23}$'),
 device text not null check(device in('phone','desktop')),
 started_at timestamptz not null default now()
);
create table takeover_admin.study_answers (
 session uuid not null references takeover_admin.study_sessions(id) on delete cascade,
 step text not null check(step ~ '^[a-z][a-z0-9-]{1,39}$'),
 chosen text[] not null check(cardinality(chosen)<=12),
 shown text[] not null check(cardinality(shown)<=12),
 text text not null check(length(text)<=280),
 elapsed_ms integer not null check(elapsed_ms between 0 and 3600000),
 saved_at timestamptz not null default now(),
 primary key(session,step)
);
create table takeover_admin.study_contacts (
 email text primary key check(length(email)<=254 and email=lower(email)),
 pilot boolean not null,
 session uuid references takeover_admin.study_sessions(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table takeover_admin.study_sessions enable row level security;
alter table takeover_admin.study_answers enable row level security;
alter table takeover_admin.study_contacts enable row level security;
revoke all on takeover_admin.study_sessions,takeover_admin.study_answers,takeover_admin.study_contacts
 from public,anon,authenticated;

-- Starting a session twice changes nothing.
create function public.study_start(p_session uuid,p_version text,p_source text,p_device text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('takeover_admin.study_sessions'));
 if exists(select 1 from takeover_admin.study_sessions where id=p_session) then return; end if;
 if (select count(*) from takeover_admin.study_sessions)>=5000 then raise exception 'study_session_limit'; end if;
 insert into takeover_admin.study_sessions(id,version,source,device) values(p_session,p_version,p_source,p_device);
end $$;

-- An answer replaces the earlier answer for the same step, so the participant can go back.
create function public.study_save_answer(p_session uuid,p_step text,p_chosen text[],p_shown text[],p_text text,p_elapsed_ms integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 -- The session row serializes the answers of one participant, so the limit below holds.
 perform 1 from takeover_admin.study_sessions where id=p_session for update;
 if not found then raise exception 'study_session_unknown'; end if;
 if not exists(select 1 from takeover_admin.study_answers where session=p_session and step=p_step)
  and (select count(*) from takeover_admin.study_answers where session=p_session)>=60
 then raise exception 'study_answer_limit'; end if;
 insert into takeover_admin.study_answers(session,step,chosen,shown,text,elapsed_ms)
 values(p_session,p_step,p_chosen,p_shown,p_text,p_elapsed_ms)
 on conflict(session,step) do update set chosen=excluded.chosen,shown=excluded.shown,text=excluded.text,
  elapsed_ms=excluded.elapsed_ms,saved_at=now();
end $$;

-- One row per address; a second submission updates the pilot flag and the link to a session.
create function public.study_save_contact(p_email text,p_pilot boolean,p_session uuid) returns void
language plpgsql security definer set search_path='' as $$
declare address text:=lower(btrim(p_email));
begin
 perform pg_advisory_xact_lock(hashtext('takeover_admin.study_contacts'));
 if p_session is not null and not exists(select 1 from takeover_admin.study_sessions where id=p_session)
 then raise exception 'study_session_unknown'; end if;
 if not exists(select 1 from takeover_admin.study_contacts where email=address)
  and (select count(*) from takeover_admin.study_contacts)>=2000
 then raise exception 'study_contact_limit'; end if;
 insert into takeover_admin.study_contacts(email,pilot,session) values(address,p_pilot,p_session)
 on conflict(email) do update set pilot=excluded.pilot,session=excluded.session;
end $$;

revoke all on function public.study_start(uuid,text,text,text),
 public.study_save_answer(uuid,text,text[],text[],text,integer),
 public.study_save_contact(text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.study_start(uuid,text,text,text),
 public.study_save_answer(uuid,text,text[],text[],text,integer),
 public.study_save_contact(text,boolean,uuid) to service_role;

commit;
