-- Fix: "infinite recursion detected in policy for relation businesses"
-- Cause: businesses policies referenced business_members, and business_members policies
-- referenced businesses, so Postgres re-evaluated RLS in a loop.
-- Fix: SECURITY DEFINER helpers read base tables without RLS.

CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id AND b.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = p_business_id AND bm.user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_owner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid, uuid) TO service_role;

-- businesses: replace policies
DROP POLICY IF EXISTS "businesses_select_member" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_owner" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_owner" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_owner" ON public.businesses;

CREATE POLICY "businesses_select_member"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR public.is_business_member(id, (SELECT auth.uid()))
  );

CREATE POLICY "businesses_insert_owner"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "businesses_update_owner"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "businesses_delete_owner"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- business_members: replace policies
DROP POLICY IF EXISTS "business_members_select_self_or_owner" ON public.business_members;
DROP POLICY IF EXISTS "business_members_insert_owner_only" ON public.business_members;
DROP POLICY IF EXISTS "business_members_update_owner" ON public.business_members;
DROP POLICY IF EXISTS "business_members_delete_owner" ON public.business_members;

CREATE POLICY "business_members_select_self_or_owner"
  ON public.business_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_business_owner(business_id, (SELECT auth.uid()))
  );

CREATE POLICY "business_members_insert_owner_only"
  ON public.business_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_owner(business_id, (SELECT auth.uid())));

CREATE POLICY "business_members_update_owner"
  ON public.business_members
  FOR UPDATE
  TO authenticated
  USING (public.is_business_owner(business_id, (SELECT auth.uid())))
  WITH CHECK (public.is_business_owner(business_id, (SELECT auth.uid())));

CREATE POLICY "business_members_delete_owner"
  ON public.business_members
  FOR DELETE
  TO authenticated
  USING (public.is_business_owner(business_id, (SELECT auth.uid())));

-- entity_records: use helper so policies do not recurse via business_members RLS
DROP POLICY IF EXISTS "entity_records_select_member" ON public.entity_records;
DROP POLICY IF EXISTS "entity_records_insert_member" ON public.entity_records;
DROP POLICY IF EXISTS "entity_records_update_member" ON public.entity_records;
DROP POLICY IF EXISTS "entity_records_delete_member" ON public.entity_records;

CREATE POLICY "entity_records_select_member"
  ON public.entity_records
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(business_id, (SELECT auth.uid())));

CREATE POLICY "entity_records_insert_member"
  ON public.entity_records
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_member(business_id, (SELECT auth.uid())));

CREATE POLICY "entity_records_update_member"
  ON public.entity_records
  FOR UPDATE
  TO authenticated
  USING (public.is_business_member(business_id, (SELECT auth.uid())))
  WITH CHECK (public.is_business_member(business_id, (SELECT auth.uid())));

CREATE POLICY "entity_records_delete_member"
  ON public.entity_records
  FOR DELETE
  TO authenticated
  USING (public.is_business_member(business_id, (SELECT auth.uid())));
