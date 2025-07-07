-- Create techniques table
CREATE TABLE IF NOT EXISTS techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT,
  mux_playback_id TEXT NOT NULL,
  thumbnail_time INTEGER,
  user_id UUID REFERENCES auth.users(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  technique_id UUID REFERENCES techniques(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, technique_id)
);

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  technique_id UUID REFERENCES techniques(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, technique_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  technique_id UUID REFERENCES techniques(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create replies table
CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  comment_id UUID REFERENCES comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Create policies for techniques (allow all authenticated users to read, only owners to modify)
CREATE POLICY "Allow authenticated users to view techniques" ON techniques
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to insert their own techniques" ON techniques
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own techniques" ON techniques
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own techniques" ON techniques
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create policies for likes
CREATE POLICY "Allow authenticated users to view likes" ON likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to manage their own likes" ON likes
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create policies for playlists
CREATE POLICY "Allow users to view their own playlists" ON playlists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own playlists" ON playlists
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create policies for comments
CREATE POLICY "Allow authenticated users to view comments" ON comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to insert comments" ON comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own comments" ON comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own comments" ON comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create policies for replies
CREATE POLICY "Allow authenticated users to view replies" ON replies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to insert replies" ON replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own replies" ON replies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own replies" ON replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Insert sample data (optional)
INSERT INTO techniques (title, position, description, mux_playback_id, user_id) VALUES
('Basic Armbar from Guard', 'Closed Guard', 'A fundamental submission technique from closed guard position', 'sample_playback_id_1', auth.uid()),
('Triangle Choke Setup', 'Closed Guard', 'Setting up the triangle choke from guard', 'sample_playback_id_2', auth.uid())
ON CONFLICT DO NOTHING; 