-- Demo students may be opened for the team's demo login. Opening changes the password, confirmation
-- and ban columns, so the demo marker alone decides. App metadata is set only by trusted server paths.
begin;

create or replace function takeover_admin.is_demo_seller(seller uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from auth.users where id=seller and raw_app_meta_data->>'demo_seed'='takeover-demo-v2');
$$;

-- Run by hand in the SQL Editor: lifts the ban, so the server can sign the team in as these students.
-- They keep no password, and their addresses receive no mail.
create function takeover_admin.open_demo_accounts() returns setof text
language sql set search_path='' as $$
 update auth.users set banned_until=null,email_confirmed_at=coalesce(email_confirmed_at,now()),
  confirmation_token=coalesce(confirmation_token,''),recovery_token=coalesce(recovery_token,''),
  email_change=coalesce(email_change,''),email_change_token_new=coalesce(email_change_token_new,'')
 where takeover_admin.is_demo_seller(id)
 returning email::text;
$$;

-- Ends the demo login: bans the demo students again and signs them out.
create function takeover_admin.close_demo_accounts() returns setof text
language plpgsql set search_path='' as $$
begin
 delete from auth.sessions where takeover_admin.is_demo_seller(user_id);
 return query update auth.users set banned_until='infinity'
  where takeover_admin.is_demo_seller(id) returning email::text;
end $$;

revoke all on function takeover_admin.open_demo_accounts(),takeover_admin.close_demo_accounts()
 from public,anon,authenticated;
commit;
