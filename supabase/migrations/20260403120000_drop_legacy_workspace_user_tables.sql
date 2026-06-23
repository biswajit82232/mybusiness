-- Remove legacy workspace / per-user tables from an earlier schema.
-- Keeps Phase A tables: public.businesses, public.business_members.
--
-- DATA SAFETY: refuses to drop any legacy table that still has rows.
-- If this migration fails, migrate data into public.entity_records first,
-- then re-run `supabase db push`. Never run on production with live legacy data
-- until you have confirmed a backup and migration path.

DO $$
DECLARE
  legacy_tables text[] := ARRAY[
    'workspace_members',
    'workspace_snapshots',
    'user_dismissed_alerts',
    'user_emi_entries',
    'user_expenses',
    'user_inventory_entries',
    'user_recurring_expenses',
    'user_sales',
    'user_settings',
    'user_snapshots',
    'workspaces'
  ];
  t text;
  row_count bigint;
BEGIN
  FOREACH t IN ARRAY legacy_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('SELECT count(*)::bigint FROM public.%I', t) INTO row_count;
    IF row_count > 0 THEN
      RAISE EXCEPTION
        'Legacy table public.% still has % row(s). Migrate to entity_records before dropping. Back up first.',
        t,
        row_count;
    END IF;
  END LOOP;
END $$;

-- Children first (typical FKs point at workspaces / auth.users).
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspace_snapshots CASCADE;

DROP TABLE IF EXISTS public.user_dismissed_alerts CASCADE;
DROP TABLE IF EXISTS public.user_emi_entries CASCADE;
DROP TABLE IF EXISTS public.user_expenses CASCADE;
DROP TABLE IF EXISTS public.user_inventory_entries CASCADE;
DROP TABLE IF EXISTS public.user_recurring_expenses CASCADE;
DROP TABLE IF EXISTS public.user_sales CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.user_snapshots CASCADE;

DROP TABLE IF EXISTS public.workspaces CASCADE;
