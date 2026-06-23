-- =============================================================================
-- PROPOSED additive migration — DO NOT APPLY without review.
--
-- Adds a nullable `client_updated_at timestamptz` column to entity_records and
-- updates the sync_upsert_entity_record RPC to persist it. The existing
-- `updated_at` column is still server-controlled by the BEFORE trigger; the
-- new column simply records when the CLIENT last edited the row, which is
-- useful for "actually-last-modified" UIs and for ordering when comparing the
-- same record across clients.
--
-- Data-safety properties (verify before applying):
--   • Column is nullable; no UPDATE, no backfill, no NOT NULL.
--   • Existing rows continue to have NULL for client_updated_at.
--   • The RPC is REPLACED (CREATE OR REPLACE) keeping the same signature, so
--     older clients that already call it continue to work unchanged.
--   • Server-side `updated_at` semantics are NOT changed.
--   • No RLS policy changes; no privilege changes (GRANT re-applied just to
--     be explicit if you alter the function body further later).
--   • No DROP, no DELETE, no destructive operations.
--
-- To apply:
--   1) Move this file into supabase/migrations/, rename to
--      YYYYMMDDHHmmss_entity_records_client_updated_at.sql.
--   2) Verify on a staging project: supabase db push
--   3) Confirm existing rows are intact: SELECT count(*) FROM entity_records;
--   4) Roll forward on production.
-- =============================================================================

ALTER TABLE public.entity_records
  ADD COLUMN IF NOT EXISTS client_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_upsert_entity_record(
  p_business_id uuid,
  p_entity_type text,
  p_record_id text,
  p_payload jsonb,
  p_deleted boolean DEFAULT false,
  p_client_updated_at timestamptz DEFAULT NULL,
  p_base_version bigint DEFAULT NULL
)
RETURNS TABLE (
  applied boolean,
  conflict boolean,
  current_version bigint,
  current_updated_at timestamptz,
  conflict_reason text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.entity_records%ROWTYPE;
BEGIN
  IF NOT (
    public.is_business_member(p_business_id, (SELECT auth.uid()))
    OR public.is_business_owner(p_business_id, (SELECT auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Not allowed'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_row
  FROM public.entity_records
  WHERE business_id = p_business_id
    AND entity_type = p_entity_type
    AND record_id = p_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.entity_records (
      business_id, entity_type, record_id,
      payload, deleted, updated_at, version, client_updated_at
    ) VALUES (
      p_business_id,
      p_entity_type,
      p_record_id,
      COALESCE(p_payload, '{}'::jsonb),
      COALESCE(p_deleted, false),
      COALESCE(p_client_updated_at, now()),
      1,
      p_client_updated_at
    );

    SELECT *
    INTO v_row
    FROM public.entity_records
    WHERE business_id = p_business_id
      AND entity_type = p_entity_type
      AND record_id = p_record_id;

    RETURN QUERY
    SELECT true, false, v_row.version, v_row.updated_at, NULL::text;
    RETURN;
  END IF;

  IF p_base_version IS NOT NULL AND p_base_version <> v_row.version THEN
    RETURN QUERY
    SELECT false, true, v_row.version, v_row.updated_at, 'version_mismatch'::text;
    RETURN;
  END IF;

  IF p_base_version IS NULL
     AND p_client_updated_at IS NOT NULL
     AND p_client_updated_at < v_row.updated_at THEN
    RETURN QUERY
    SELECT false, true, v_row.version, v_row.updated_at, 'stale_client_timestamp'::text;
    RETURN;
  END IF;

  UPDATE public.entity_records
  SET
    payload = COALESCE(p_payload, '{}'::jsonb),
    deleted = COALESCE(p_deleted, false),
    client_updated_at = COALESCE(p_client_updated_at, client_updated_at)
  WHERE business_id = p_business_id
    AND entity_type = p_entity_type
    AND record_id = p_record_id;

  SELECT *
  INTO v_row
  FROM public.entity_records
  WHERE business_id = p_business_id
    AND entity_type = p_entity_type
    AND record_id = p_record_id;

  RETURN QUERY
  SELECT true, false, v_row.version, v_row.updated_at, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_upsert_entity_record(uuid, text, text, jsonb, boolean, timestamptz, bigint)
TO authenticated;
