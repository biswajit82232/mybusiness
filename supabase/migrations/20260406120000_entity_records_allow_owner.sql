-- entity_records RLS: allow business owners, not only business_members rows.
-- Owners may exist without a membership row (legacy / partial setup); sync would fail with
-- "new row violates row-level security policy for table entity_records".

DROP POLICY IF EXISTS "entity_records_select_member" ON public.entity_records;
DROP POLICY IF EXISTS "entity_records_insert_member" ON public.entity_records;
DROP POLICY IF EXISTS "entity_records_update_member" ON public.entity_records;
DROP POLICY IF EXISTS "entity_records_delete_member" ON public.entity_records;

CREATE POLICY "entity_records_select_member"
  ON public.entity_records
  FOR SELECT
  TO authenticated
  USING (
    public.is_business_member(business_id, (SELECT auth.uid()))
    OR public.is_business_owner(business_id, (SELECT auth.uid()))
  );

CREATE POLICY "entity_records_insert_member"
  ON public.entity_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_business_member(business_id, (SELECT auth.uid()))
    OR public.is_business_owner(business_id, (SELECT auth.uid()))
  );

CREATE POLICY "entity_records_update_member"
  ON public.entity_records
  FOR UPDATE
  TO authenticated
  USING (
    public.is_business_member(business_id, (SELECT auth.uid()))
    OR public.is_business_owner(business_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    public.is_business_member(business_id, (SELECT auth.uid()))
    OR public.is_business_owner(business_id, (SELECT auth.uid()))
  );

CREATE POLICY "entity_records_delete_member"
  ON public.entity_records
  FOR DELETE
  TO authenticated
  USING (
    public.is_business_member(business_id, (SELECT auth.uid()))
    OR public.is_business_owner(business_id, (SELECT auth.uid()))
  );
