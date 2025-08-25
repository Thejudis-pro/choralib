-- Add a trigger to generate unique choir codes when creating choirs
CREATE OR REPLACE FUNCTION public.generate_choir_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.choirs WHERE choirs.code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create trigger to auto-generate choir codes
CREATE OR REPLACE FUNCTION public.set_choir_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := public.generate_choir_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS set_choir_code_trigger ON public.choirs;
CREATE TRIGGER set_choir_code_trigger
  BEFORE INSERT ON public.choirs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_choir_code();