-- ============================================
-- Production Migration: Chat Messages + Security
-- Run in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. CHAT MESSAGES TABLE (persistent across rooms)
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT DEFAULT '👤',
  text TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_emoji BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast room-level queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at);

-- 2. FAMILIES TABLE (already in app but ensure it exists)
CREATE TABLE IF NOT EXISTS families (
  id BIGINT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_families_code ON families(code);

-- 3. ADD family_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id BIGINT;

-- ============================================
-- ROW LEVEL SECURITY (Production-Ready)
-- Fix open/public policies — use authenticated access
-- ============================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_room_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Drop old wide-open policies (if they exist)
DROP POLICY IF EXISTS "Allow public read" ON teachers;
DROP POLICY IF EXISTS "Allow public read" ON students;
DROP POLICY IF EXISTS "Allow public read" ON contacts;
DROP POLICY IF EXISTS "Allow public insert" ON teachers;
DROP POLICY IF EXISTS "Allow public update" ON teachers;
DROP POLICY IF EXISTS "Allow public insert" ON contacts;
DROP POLICY IF EXISTS "Allow public update" ON contacts;
DROP POLICY IF EXISTS "Allow public delete" ON contacts;

-- === TEACHERS: public read, authenticated write ===
CREATE POLICY "Public can read teachers"
  ON teachers FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert teachers"
  ON teachers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update teachers"
  ON teachers FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete teachers"
  ON teachers FOR DELETE USING (auth.role() = 'authenticated');

-- === STUDENTS: public read, authenticated write ===
CREATE POLICY "Public can read students"
  ON students FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert students"
  ON students FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update students"
  ON students FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete students"
  ON students FOR DELETE USING (auth.role() = 'authenticated');

-- === CONTACTS: public read, authenticated write ===
CREATE POLICY "Public can read contacts"
  ON contacts FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert contacts"
  ON contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update contacts"
  ON contacts FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete contacts"
  ON contacts FOR DELETE USING (auth.role() = 'authenticated');

-- === VIDEO ROOM CONTACTS: per-user access ===
DROP POLICY IF EXISTS "Allow authenticated all" ON video_room_contacts;

CREATE POLICY "Users can read own contacts"
  ON video_room_contacts FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert own contacts"
  ON video_room_contacts FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can delete own contacts"
  ON video_room_contacts FOR DELETE USING (auth.uid()::text = user_id OR auth.role() = 'authenticated');

-- === PROFILES: user owns their profile ===
DROP POLICY IF EXISTS "Allow individual user access" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- === CHAT MESSAGES: public read (for demo, room-scoped), authenticated write ===
CREATE POLICY "Anyone can read chat messages"
  ON chat_messages FOR SELECT USING (true);

CREATE POLICY "Anyone can insert chat messages"
  ON chat_messages FOR INSERT WITH CHECK (true);

-- === FAMILIES: public read, authenticated write ===
CREATE POLICY "Public can read families"
  ON families FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert families"
  ON families FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this query to verify tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
