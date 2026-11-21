-- OPTIONAL SANDBOX DEMO SEED. Run in the SQL Editor after the admin migration.
-- The shipped catalog is stored by the migration. This seed preserves existing edits.
begin;
select takeover_admin.seed_demo_catalog(false);
commit;
