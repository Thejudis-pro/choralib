
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create all tables first (no policies yet)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.choirs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choir_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.choir_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  choir_id UUID NOT NULL REFERENCES public.choirs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(choir_id, user_id)
);

CREATE TABLE public.partitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  choir_id UUID REFERENCES public.choirs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partition_id UUID NOT NULL REFERENCES public.partitions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, partition_id)
);

CREATE TABLE public.partition_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partition_id UUID NOT NULL REFERENCES public.partitions(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download')),
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choir_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partition_access ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Choirs policies
CREATE POLICY "Admins can manage own choirs" ON public.choirs FOR ALL USING (auth.uid() = admin_id);
CREATE POLICY "Members can view their choirs" ON public.choirs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.choir_members cm WHERE cm.choir_id = id AND cm.user_id = auth.uid())
);

-- Choir members policies
CREATE POLICY "Admins can manage choir members" ON public.choir_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.choirs c WHERE c.id = choir_id AND c.admin_id = auth.uid())
);
CREATE POLICY "Members can view their memberships" ON public.choir_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join choirs" ON public.choir_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Partitions policies
CREATE POLICY "Uploaders can manage own partitions" ON public.partitions FOR ALL USING (auth.uid() = uploaded_by);
CREATE POLICY "Public partitions viewable by all" ON public.partitions FOR SELECT USING (is_public = true);
CREATE POLICY "Choir members can view choir partitions" ON public.partitions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.choir_members cm WHERE cm.choir_id = choir_id AND cm.user_id = auth.uid())
);

-- Favorites policies
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Partition access policies
CREATE POLICY "Users can view own access history" ON public.partition_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own access" ON public.partition_access FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_choirs_updated_at BEFORE UPDATE ON public.choirs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partitions_updated_at BEFORE UPDATE ON public.partitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('partitions', 'partitions', false);
CREATE POLICY "Authenticated users can upload partitions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'partitions' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view partitions" ON storage.objects FOR SELECT USING (bucket_id = 'partitions' AND auth.role() = 'authenticated');
