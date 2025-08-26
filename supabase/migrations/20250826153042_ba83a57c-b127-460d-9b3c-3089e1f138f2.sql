-- Create security definer functions to break RLS recursion

-- Function to check if user is admin of a choir
CREATE OR REPLACE FUNCTION public.is_choir_admin(choir_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.choirs 
    WHERE id = choir_id AND admin_id = user_id
  );
$$;

-- Function to check if user is member of a choir
CREATE OR REPLACE FUNCTION public.is_choir_member(choir_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.choir_members 
    WHERE choir_id = choir_id AND user_id = user_id
  );
$$;

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Members can view choirs they belong to" ON public.choirs;
DROP POLICY IF EXISTS "Admins can manage choir members" ON public.choir_members;
DROP POLICY IF EXISTS "Admins can remove choir members" ON public.choir_members;
DROP POLICY IF EXISTS "Users can view choir memberships" ON public.choir_members;

-- Recreate policies using security definer functions to prevent recursion

-- Choir policies (simplified to avoid recursion)
CREATE POLICY "Members can view choirs they belong to" 
ON public.choirs 
FOR SELECT 
USING (public.is_choir_member(id, auth.uid()));

-- Choir member policies using security definer functions
CREATE POLICY "Admins can manage choir members" 
ON public.choir_members 
FOR INSERT 
WITH CHECK (public.is_choir_admin(choir_id, auth.uid()));

CREATE POLICY "Admins can remove choir members" 
ON public.choir_members 
FOR DELETE 
USING (public.is_choir_admin(choir_id, auth.uid()));

CREATE POLICY "Users can view choir memberships" 
ON public.choir_members 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  public.is_choir_admin(choir_id, auth.uid())
);