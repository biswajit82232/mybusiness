-- Additive only: nullable client timestamp + persist it in sync RPC.
-- Safe for existing production rows (NULL client_updated_at; no backfill).

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
