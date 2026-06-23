-- Phase A foundation (ARCHITECTURE_AND_IMPLEMENTATION.md): multi-tenant core + RLS.
-- Requires Supabase Auth (auth.users).

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX businesses_owner_id_idx ON public.businesses (owner_id);

-- ---------------------------------------------------------------------------
-- business_members — who belongs to which business
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX business_members_business_id_idx ON public.business_members (business_id);
CREATE INDEX business_members_user_id_idx ON public.business_members (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- businesses: visible if owner or member
CREATE POLICY "businesses_select_member"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.business_members bm
      WHERE bm.business_id = businesses.id
        AND bm.user_id = (SELECT auth.uid())
    )
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

-- business_members: read own rows
CREATE POLICY "business_members_select_self_or_owner"
  ON public.business_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = (SELECT auth.uid())
    )
  );

-- Insert: only the business owner can add members (including first row after create).
CREATE POLICY "business_members_insert_owner_only"
  ON public.business_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "business_members_update_owner"
  ON public.business_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "business_members_delete_owner"
  ON public.business_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = business_members.business_id
        AND b.owner_id = (SELECT auth.uid())
    )
  );
