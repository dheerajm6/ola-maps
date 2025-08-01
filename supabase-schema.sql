-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  preferences JSONB DEFAULT '{"theme": "light", "map_style": "default", "show_traffic": true, "show_signals": true, "navigation_voice": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traffic signal simulation states table
-- This overlays simulation data on Ola Maps' existing traffic signal locations
CREATE TABLE public.traffic_signal_simulations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ola_signal_id TEXT NOT NULL, -- Reference to Ola Maps traffic signal ID
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  intersection_name TEXT NOT NULL,
  current_state JSONB DEFAULT '{"main_road": "red", "side_road": "green", "pedestrian_walk": "dont_walk", "countdown": 0}',
  timing_config JSONB DEFAULT '{"red_duration": 45000, "green_duration": 60000, "yellow_duration": 5000, "walk_duration": 30000}',
  cycle_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorites and search history (since we're using Ola Maps POI data)
CREATE TABLE public.user_places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  ola_place_id TEXT NOT NULL, -- Reference to Ola Maps place ID
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  place_type TEXT,
  is_favorite BOOLEAN DEFAULT false,
  visit_count INTEGER DEFAULT 1,
  last_visited TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Navigation sessions for analytics
CREATE TABLE public.navigation_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  start_lat DECIMAL(10, 8) NOT NULL,
  start_lng DECIMAL(11, 8) NOT NULL,
  end_lat DECIMAL(10, 8) NOT NULL,
  end_lng DECIMAL(11, 8) NOT NULL,
  start_address TEXT,
  end_address TEXT,
  estimated_duration INTEGER, -- from Ola Maps API
  actual_duration INTEGER,
  distance DECIMAL(10, 2), -- from Ola Maps API
  signals_encountered INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active'
);

-- Indexes for performance
CREATE INDEX idx_signal_simulations_ola_id ON public.traffic_signal_simulations (ola_signal_id);
CREATE INDEX idx_signal_simulations_active ON public.traffic_signal_simulations (is_active);
CREATE INDEX idx_user_places_user_favorites ON public.user_places (user_id, is_favorite);
CREATE INDEX idx_navigation_sessions_user ON public.navigation_sessions (user_id);

-- RLS (Row Level Security) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- User places policies  
CREATE POLICY "Users can view own places" ON public.user_places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own places" ON public.user_places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own places" ON public.user_places FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own places" ON public.user_places FOR DELETE USING (auth.uid() = user_id);

-- Navigation sessions policies
CREATE POLICY "Users can view own sessions" ON public.navigation_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.navigation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.navigation_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Traffic signal simulations are public read-only
CREATE POLICY "Anyone can view signal simulations" ON public.traffic_signal_simulations FOR SELECT TO public USING (true);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update signal simulation state based on timing
CREATE OR REPLACE FUNCTION update_signal_state()
RETURNS TRIGGER AS $$
DECLARE
    config JSONB;
    elapsed_ms INTEGER;
    cycle_duration INTEGER;
    current_phase TEXT;
    countdown INTEGER;
BEGIN
    config := NEW.timing_config;
    elapsed_ms := EXTRACT(EPOCH FROM NOW() - NEW.cycle_start_time) * 1000;
    cycle_duration := (config->>'red_duration')::INTEGER + (config->>'green_duration')::INTEGER + (config->>'yellow_duration')::INTEGER * 2;
    
    -- Calculate current position in cycle
    elapsed_ms := elapsed_ms % cycle_duration;
    
    IF elapsed_ms < (config->>'red_duration')::INTEGER THEN
        current_phase := 'red';
        countdown := (config->>'red_duration')::INTEGER - elapsed_ms;
    ELSIF elapsed_ms < (config->>'red_duration')::INTEGER + (config->>'yellow_duration')::INTEGER THEN
        current_phase := 'yellow';
        countdown := (config->>'red_duration')::INTEGER + (config->>'yellow_duration')::INTEGER - elapsed_ms;
    ELSIF elapsed_ms < (config->>'red_duration')::INTEGER + (config->>'yellow_duration')::INTEGER + (config->>'green_duration')::INTEGER THEN
        current_phase := 'green';
        countdown := (config->>'red_duration')::INTEGER + (config->>'yellow_duration')::INTEGER + (config->>'green_duration')::INTEGER - elapsed_ms;
    ELSE
        current_phase := 'yellow';
        countdown := cycle_duration - elapsed_ms;
    END IF;
    
    NEW.current_state := jsonb_build_object(
        'main_road', current_phase,
        'side_road', CASE WHEN current_phase = 'green' THEN 'red' ELSE 'green' END,
        'pedestrian_walk', CASE WHEN current_phase = 'red' THEN 'walk' ELSE 'dont_walk' END,
        'countdown', countdown / 1000
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;