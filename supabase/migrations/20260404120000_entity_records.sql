-- Normalized cloud mirror: one row per (business, entity_type, record_id).
-- Payload matches IndexedDB entity rows; last-write-wins via client `updated_at`.

CREATE TABLE public.entity_records (
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN (
    'settings',
    'sales',
    'expenses',
    'recurringExpenses',
    'inventoryEntries',
    'emiEntries',
    'dismissedAlertIds'
  )),
  record_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (business_id, entity_type, record_id)
);

CREATE INDEX entity_records_business_updated_idx
  ON public.entity_records (business_id, updated_at DESC);

ALTER TABLE public.entity_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_records_select_member"
  ON public.entity_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.business_id = entity_records.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "entity_records_insert_member"
  ON public.entity_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.business_id = entity_records.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "entity_records_update_member"
  ON public.entity_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.business_id = entity_records.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.business_id = entity_records.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "entity_records_delete_member"
  ON public.entity_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.business_id = entity_records.business_id
        AND bm.user_id = (SELECT auth.uid())
    )
  );
