-- Lief Healthcare Database Schema
-- Run this in your Supabase SQL Editor

-- Create managers table to store allowed manager emails
CREATE TABLE IF NOT EXISTS managers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manager settings table
CREATE TABLE manager_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  perimeter_lat DECIMAL(10, 8) NOT NULL,
  perimeter_long DECIMAL(11, 8) NOT NULL,
  radius_km DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shifts table
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_in_location TEXT NOT NULL,
  clock_out_location TEXT,
  clock_in_note TEXT,
  clock_out_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint after table creation
ALTER TABLE shifts ADD CONSTRAINT fk_shifts_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_clock_in_time ON shifts(clock_in_time);
CREATE INDEX idx_shifts_clock_out_time ON shifts(clock_out_time);

-- Insert sample manager settings for West Delhi, Jail Road, Subhash Nagar
-- Coordinates for Subhash Nagar, West Delhi area with 1km radius
INSERT INTO manager_settings (perimeter_lat, perimeter_long, radius_km) 
VALUES (28.6330, 77.1048, 1.0);

-- Enable Row Level Security (RLS)
ALTER TABLE manager_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shifts table
CREATE POLICY IF NOT EXISTS "Users can view their own shifts" ON shifts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own shifts" ON shifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own shifts" ON shifts
  FOR UPDATE USING (auth.uid() = user_id);

-- Manager override: allow select to managers by email
CREATE POLICY IF NOT EXISTS "Managers can view all shifts" ON shifts
  FOR SELECT TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM managers m
    WHERE m.email = auth.jwt() ->> 'email'
  ));

-- Managers table policies: allow only managers to read list
CREATE POLICY IF NOT EXISTS "Managers read managers" ON managers
  FOR SELECT TO authenticated
  USING ( (auth.jwt() ->> 'email') IN (SELECT email FROM managers) );

-- Create RLS policies for manager_settings table
CREATE POLICY "Authenticated users can view manager settings" ON manager_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_manager_settings_updated_at 
  BEFORE UPDATE ON manager_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at 
  BEFORE UPDATE ON shifts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for shift statistics
CREATE VIEW shift_stats AS
SELECT 
  user_id,
  COUNT(*) as total_shifts,
  COUNT(CASE WHEN clock_out_time IS NOT NULL THEN 1 END) as completed_shifts,
  SUM(CASE WHEN clock_out_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600 
    ELSE 0 END) as total_hours,
  AVG(CASE WHEN clock_out_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600 
    ELSE NULL END) as avg_hours_per_shift
FROM shifts
GROUP BY user_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
