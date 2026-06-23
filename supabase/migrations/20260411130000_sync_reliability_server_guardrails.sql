-- Server-side reliability guardrails for sync:
-- 1) server-authoritative updated_at
-- 2) row version counter for conflict detection
-- 3) RPC upsert that can reject stale writes

ALTER TABLE public.entity_records
  ADD COLUMN IF NOT EXISTS version bigint;

UPDATE public.entity_records
SET version = 1
WHERE version IS NULL;

ALTER TABLE public.entity_records
  ALTER COLUMN version SET DEFAULT 1;

ALTER TABLE public.entity_records
  ALTER COLUMN version SET NOT NULL;

CREATE OR REPLACE FUNCTION public.entity_records_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    NEW.version := COALESCE(NEW.version, 1);
    IF NEW.version < 1 THEN NEW.version := 1; END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: stamp time on server, bump version only when row content changes
  NEW.updated_at := now();
  IF NEW.payload IS DISTINCT FROM OLD.payload OR NEW.deleted IS DISTINCT FROM OLD.deleted THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  ELSE
    NEW.version := COALESCE(OLD.version, 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_entity_records_before_write ON public.entity_records;
CREATE TRIGGER trg_entity_records_before_write
BEFORE INSERT OR UPDATE ON public.entity_records
FOR EACH ROW
EXECUTE FUNCTION public.entity_records_before_write();

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
      business_id, entity_type, record_id, payload, deleted, updated_at, version
    ) VALUES (
      p_business_id,
      p_entity_type,
      p_record_id,
      COALESCE(p_payload, '{}'::jsonb),
      COALESCE(p_deleted, false),
      COALESCE(p_client_updated_at, now()),
      1
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
    deleted = COALESCE(p_deleted, false)
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
