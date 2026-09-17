-- Local-only scaffolding — NOT part of the app migrations.
-- Supabase provisions the anon/authenticated/service_role roles automatically and
-- grants service_role BYPASSRLS. A plain local cluster has none of that, so the
-- SQL test harness creates equivalents before applying 001_naviable.sql.
select 'create role anon nologin'
  where not exists (select 1 from pg_roles where rolname = 'anon') \gexec
select 'create role authenticated nologin'
  where not exists (select 1 from pg_roles where rolname = 'authenticated') \gexec
select 'create role service_role nologin bypassrls'
  where not exists (select 1 from pg_roles where rolname = 'service_role') \gexec
