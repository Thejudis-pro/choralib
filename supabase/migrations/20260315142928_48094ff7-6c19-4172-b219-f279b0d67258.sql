-- Fix recursive RLS policies causing dashboard load failures

-- Helper: check if a user administers a choir (SECURITY DEFINER avoids recursive RLS checks)
create or replace function public.is_choir_admin(_choir_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.choirs c
    where c.id = _choir_id
      and c.admin_id = _user_id
  );
$$;

-- Helper: check if a user is a member of a choir (SECURITY DEFINER avoids recursive RLS checks)
create or replace function public.is_choir_member(_choir_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.choir_members cm
    where cm.choir_id = _choir_id
      and cm.user_id = _user_id
  );
$$;

-- Rebuild choirs policies
DROP POLICY IF EXISTS "Admins can manage own choirs" ON public.choirs;
DROP POLICY IF EXISTS "Members can view their choirs" ON public.choirs;

CREATE POLICY "Admins can manage own choirs"
ON public.choirs
FOR ALL
TO authenticated
USING (auth.uid() = admin_id)
WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Members can view their choirs"
ON public.choirs
FOR SELECT
TO authenticated
USING (public.is_choir_member(id, auth.uid()));

-- Rebuild choir_members policies (avoid direct subqueries to choirs)
DROP POLICY IF EXISTS "Admins can manage choir members" ON public.choir_members;
DROP POLICY IF EXISTS "Members can view their memberships" ON public.choir_members;
DROP POLICY IF EXISTS "Users can join choirs" ON public.choir_members;

CREATE POLICY "Users can view memberships"
ON public.choir_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_choir_admin(choir_id, auth.uid())
);

CREATE POLICY "Users can join choirs"
ON public.choir_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.is_choir_admin(choir_id, auth.uid())
);

CREATE POLICY "Admins can update choir members"
ON public.choir_members
FOR UPDATE
TO authenticated
USING (public.is_choir_admin(choir_id, auth.uid()))
WITH CHECK (public.is_choir_admin(choir_id, auth.uid()));

CREATE POLICY "Admins can delete choir members"
ON public.choir_members
FOR DELETE
TO authenticated
USING (public.is_choir_admin(choir_id, auth.uid()));

-- Fix partitions visibility policy logic and recursion risk
DROP POLICY IF EXISTS "Choir members can view choir partitions" ON public.partitions;

CREATE POLICY "Choir members can view choir partitions"
ON public.partitions
FOR SELECT
TO authenticated
USING (
  choir_id IS NOT NULL
  AND (
    public.is_choir_member(choir_id, auth.uid())
    OR public.is_choir_admin(choir_id, auth.uid())
  )
);