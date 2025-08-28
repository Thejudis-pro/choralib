-- Create partition_access table for tracking partition usage
CREATE TABLE IF NOT EXISTS partition_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partition_id UUID NOT NULL REFERENCES partitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partition_access_partition_id ON partition_access(partition_id);
CREATE INDEX IF NOT EXISTS idx_partition_access_user_id ON partition_access(user_id);
CREATE INDEX IF NOT EXISTS idx_partition_access_accessed_at ON partition_access(accessed_at);

-- Create unique constraint to prevent duplicate access records
CREATE UNIQUE INDEX IF NOT EXISTS idx_partition_access_unique ON partition_access(partition_id, user_id);

-- Enable RLS
ALTER TABLE partition_access ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own partition access records" ON partition_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own partition access records" ON partition_access
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partition access records" ON partition_access
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow choir admins to view access records for their choir's partitions
CREATE POLICY "Choir admins can view partition access for their choir" ON partition_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM choirs c
      JOIN partitions p ON p.choir_id = c.id
      WHERE p.id = partition_access.partition_id
      AND c.admin_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partition_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_partition_access_updated_at
  BEFORE UPDATE ON partition_access
  FOR EACH ROW
  EXECUTE FUNCTION update_partition_access_updated_at();
