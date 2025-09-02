-- Create partition_access table for tracking partition views and downloads
CREATE TABLE public.partition_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partition_id UUID NOT NULL,
  user_id UUID NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_viewed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partition_access ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own partition access" 
ON public.partition_access 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partition access" 
ON public.partition_access 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partition access" 
ON public.partition_access 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all partition access for their choirs
CREATE POLICY "Admins can view choir partition access" 
ON public.partition_access 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM partitions p 
  JOIN choirs c ON p.choir_id = c.id 
  WHERE p.id = partition_access.partition_id 
  AND c.admin_id = auth.uid()
));