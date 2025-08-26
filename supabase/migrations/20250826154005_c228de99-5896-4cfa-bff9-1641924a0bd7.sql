-- Fix the parameter collision in is_choir_member function
CREATE OR REPLACE FUNCTION public.is_choir_member(choir_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.choir_members cm
    WHERE cm.choir_id = is_choir_member.choir_id AND cm.user_id = is_choir_member.user_id
  );
$$;