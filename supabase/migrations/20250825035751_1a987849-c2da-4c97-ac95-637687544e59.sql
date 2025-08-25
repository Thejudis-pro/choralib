-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'member');

-- Create enum for voice types
CREATE TYPE public.voice_type AS ENUM ('soprano', 'alto', 'tenor', 'bass', 'all');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'member',
  subscription_active BOOLEAN NOT NULL DEFAULT false,
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create choirs table
CREATE TABLE public.choirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create choir_members table (junction table)
CREATE TABLE public.choir_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choir_id UUID NOT NULL REFERENCES public.choirs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(choir_id, user_id)
);

-- Create partitions table
CREATE TABLE public.partitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  composer TEXT,
  voice_type voice_type NOT NULL DEFAULT 'all',
  tags TEXT[],
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size INTEGER,
  choir_id UUID REFERENCES public.choirs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_big_library BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partition_id UUID NOT NULL REFERENCES public.partitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, partition_id)
);

-- Create storage buckets for PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('partition-files', 'partition-files', false);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choir_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Choirs policies
CREATE POLICY "Admins can view their choirs" ON public.choirs
  FOR SELECT USING (auth.uid() = admin_id);

CREATE POLICY "Members can view choirs they belong to" ON public.choirs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.choir_members 
      WHERE choir_id = choirs.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create choirs" ON public.choirs
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update their choirs" ON public.choirs
  FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete their choirs" ON public.choirs
  FOR DELETE USING (auth.uid() = admin_id);

-- Choir members policies
CREATE POLICY "Users can view choir memberships" ON public.choir_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.choirs WHERE id = choir_id AND admin_id = auth.uid())
  );

CREATE POLICY "Admins can manage choir members" ON public.choir_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.choirs WHERE id = choir_id AND admin_id = auth.uid())
  );

CREATE POLICY "Admins can remove choir members" ON public.choir_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.choirs WHERE id = choir_id AND admin_id = auth.uid())
  );

CREATE POLICY "Users can leave choirs" ON public.choir_members
  FOR DELETE USING (auth.uid() = user_id);

-- Partitions policies
CREATE POLICY "Users can view choir partitions" ON public.partitions
  FOR SELECT USING (
    -- Big library access for admins only
    (is_big_library = true AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin' AND subscription_active = true
    )) OR
    -- Regular choir partitions for members
    (is_big_library = false AND EXISTS (
      SELECT 1 FROM public.choir_members 
      WHERE choir_id = partitions.choir_id AND user_id = auth.uid()
    )) OR
    -- Own uploads
    uploaded_by = auth.uid()
  );

CREATE POLICY "Admins can create partitions" ON public.partitions
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update their partitions" ON public.partitions
  FOR UPDATE USING (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM public.choirs WHERE id = choir_id AND admin_id = auth.uid())
  );

CREATE POLICY "Admins can delete their partitions" ON public.partitions
  FOR DELETE USING (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM public.choirs WHERE id = choir_id AND admin_id = auth.uid())
  );

-- Favorites policies
CREATE POLICY "Users can view their favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their favorites" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for partition files
CREATE POLICY "Choir members can view partition files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'partition-files' AND
    EXISTS (
      SELECT 1 FROM public.partitions p
      JOIN public.choir_members cm ON p.choir_id = cm.choir_id
      WHERE p.file_path = name AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can upload partition files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'partition-files' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete partition files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'partition-files' AND
    EXISTS (
      SELECT 1 FROM public.partitions p
      WHERE p.file_path = name AND p.uploaded_by = auth.uid()
    )
  );

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_choirs_updated_at
  BEFORE UPDATE ON public.choirs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partitions_updated_at
  BEFORE UPDATE ON public.partitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_choirs_admin_id ON public.choirs(admin_id);
CREATE INDEX idx_choir_members_choir_id ON public.choir_members(choir_id);
CREATE INDEX idx_choir_members_user_id ON public.choir_members(user_id);
CREATE INDEX idx_partitions_choir_id ON public.partitions(choir_id);
CREATE INDEX idx_partitions_file_hash ON public.partitions(file_hash);
CREATE INDEX idx_partitions_big_library ON public.partitions(is_big_library);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Create function to generate unique choir codes
CREATE OR REPLACE FUNCTION public.generate_choir_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;