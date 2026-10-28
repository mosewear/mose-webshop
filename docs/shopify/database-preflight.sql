-- READ ONLY. Execute only in the confirmed bsklcgeyvdsxjxvmghbp project.
-- Results are aggregate/schema metadata only. No email, user ID or order rows.
begin read only;
set local statement_timeout='20s';
select jsonb_build_object(
 'postgres_major',current_setting('server_version_num')::int/10000,
 'migration_history_exists',to_regclass('supabase_migrations.schema_migrations') is not null,
 'required_roles',(select jsonb_agg(jsonb_build_object('name',rolname,'bypass_rls',rolbypassrls)) from pg_roles where rolname in ('anon','authenticated','service_role')),
 'existing_loyalty_aggregate',(select jsonb_build_object('accounts',count(*),'points_sum',sum(points_balance),'lifetime_sum',sum(lifetime_points),'null_balances',count(*) filter(where points_balance is null or lifetime_points is null)) from public.loyalty_points),
 'integration_objects',(select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity)),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and (c.relname like 'shopify_%' or c.relname like 'legacy_loyalty_%')),
 'integration_functions',(select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'security_definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl::text)),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like '%shopify%' or p.proname like '%legacy_loyalty%' or p.proname='award_loyalty_points')),
 'legacy_columns',(select jsonb_agg(jsonb_build_object('table',table_schema||'.'||table_name,'column',column_name,'type',data_type,'nullable',is_nullable,'default',column_default)) from information_schema.columns where (table_schema='public' and table_name in ('loyalty_points','loyalty_transactions','returns')) or (table_schema='auth' and table_name='users' and column_name in ('id','email'))),
 'legacy_constraints',(select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'name',conname,'definition',pg_get_constraintdef(oid))) from pg_constraint where conrelid in ('public.loyalty_points'::regclass,'public.loyalty_transactions'::regclass)),
 'legacy_indexes',(select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef)) from pg_indexes where schemaname='public' and tablename in ('loyalty_points','loyalty_transactions')),
 'legacy_financial_grants',(select jsonb_agg(jsonb_build_object('table',table_name,'role',grantee,'privilege',privilege_type)) from information_schema.role_table_grants where table_schema='public' and table_name in ('loyalty_points','loyalty_transactions') and grantee in ('anon','authenticated','service_role'))
) as schema_preflight;
-- Run this SELECT only when migration_history_exists=true above. It selects
-- version identifiers/names, never migration statements or private data.
select version,name from supabase_migrations.schema_migrations
 where version in ('20260418000001','20260419150000','20261027000100','20261027000200','20261028000100','20261028000400','20261028000500','20261028000600') order by version;
rollback;
