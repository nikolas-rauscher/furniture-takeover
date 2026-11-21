begin;

-- Survey v4 adds a fourth tick to the form at the end: "I'm up for a 15-minute chat".
-- Forms saved before it keep false, which is what they said.
alter table takeover_admin.study_pilot add column interview boolean not null default false;
alter table takeover_admin.study_pilot drop constraint study_pilot_check;
alter table takeover_admin.study_pilot add constraint study_pilot_any_tick
 check(launch_news or try_early or interview or future_surveys);

-- Who tries takeover early now names everything they want to try, not one of three roles.
-- Earlier forms keep their answer: a seller wanted to sell, a buyer to buy, both both.
alter table takeover_admin.study_pilot add column roles text[] not null default '{}'
 check(roles <@ array['buy','get-free','sell','give-away','not-sure']);
update takeover_admin.study_pilot set roles=case role
 when 'seller' then array['sell'] when 'buyer' then array['buy'] when 'both' then array['buy','sell']
 else '{}'::text[] end;
alter table takeover_admin.study_pilot drop constraint study_pilot_check1;
alter table takeover_admin.study_pilot drop column role;
alter table takeover_admin.study_pilot add constraint study_pilot_early_details
 check(try_early=(cardinality(roles)>0 and place is not null));

-- The longest option list, last-trouble for sellers, has 13 options.
alter table takeover_admin.study_answers drop constraint study_answers_chosen_check;
alter table takeover_admin.study_answers drop constraint study_answers_first_chosen_check;
alter table takeover_admin.study_answers drop constraint study_answers_shown_check;
alter table takeover_admin.study_answers add constraint study_answers_chosen_max
 check(cardinality(chosen)<=16);
alter table takeover_admin.study_answers add constraint study_answers_first_chosen_max
 check(cardinality(first_chosen)<=16);
alter table takeover_admin.study_answers add constraint study_answers_shown_max
 check(cardinality(shown)<=16);

-- The save function takes the new tick and the roles; the old signature goes.
drop function public.study_save_pilot(text,boolean,boolean,boolean,text,text);
create function public.study_save_pilot(p_email text,p_launch_news boolean,p_try_early boolean,
 p_interview boolean,p_future_surveys boolean,p_roles text[],p_place text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('takeover_admin.study_pilot'));
 if (select count(*) from takeover_admin.study_pilot)>=2000 then raise exception 'study_pilot_limit'; end if;
 insert into takeover_admin.study_pilot(email,launch_news,try_early,interview,future_surveys,roles,place)
 values(lower(btrim(p_email)),p_launch_news,p_try_early,p_interview,p_future_surveys,p_roles,p_place)
 on conflict(email) do nothing;
end $$;
revoke all on function public.study_save_pilot(text,boolean,boolean,boolean,boolean,text[],text)
 from public,anon,authenticated;
grant execute on function public.study_save_pilot(text,boolean,boolean,boolean,boolean,text[],text)
 to service_role;

-- v4 shows no counts at the end of the survey, and v3's counts were read off the desk task,
-- which v4 drops.
drop function public.study_results(text);

-- The admin rows carry the new tick and the roles; everything else is as in 202611210001_study.sql.
create or replace function public.study_report_rows(p_user uuid) returns jsonb
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
    'launchNews',p.launch_news,'tryEarly',p.try_early,'interview',p.interview,
    'futureSurveys',p.future_surveys,'roles',to_jsonb(p.roles),'place',p.place))
   from takeover_admin.study_pilot p),'[]'::jsonb));
end $$;

commit;
