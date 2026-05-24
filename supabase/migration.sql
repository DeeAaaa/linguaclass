-- ============================================
-- Classroom App Database Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS teachers (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  phone TEXT,
  avatar TEXT DEFAULT '👩‍🏫',
  status TEXT DEFAULT 'active',
  assigned_student_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher TEXT,
  total_hours INTEGER DEFAULT 30,
  used_hours INTEGER DEFAULT 0,
  days_attended INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 30,
  payment_status TEXT DEFAULT 'pending',
  payment_amount INTEGER DEFAULT 0,
  completion_status TEXT DEFAULT 'active',
  parent_name TEXT,
  parent_email TEXT,
  enrolled_date TEXT,
  parent_id BIGINT,
  avatar TEXT DEFAULT '👧',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  subject TEXT,
  teacher TEXT,
  phone TEXT,
  avatar TEXT DEFAULT '👤',
  status TEXT DEFAULT 'active',
  last_active TEXT DEFAULT 'Today',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. VIDEO ROOM CONTACTS (per-user)
CREATE TABLE IF NOT EXISTS video_room_contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. USER PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  parent_id BIGINT,
  avatar TEXT DEFAULT '👤',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SEED DATA
-- ============================================

-- Seed Teachers
INSERT INTO teachers (id, name, email, subject, phone, avatar, status, assigned_student_ids) VALUES
  (16, 'Dr. Sarah Mitchell', 'sarah.m@school.edu', 'English', '(555) 101-0001', '👩‍🏫', 'active', '[1, 5]'),
  (17, 'Ms. Emily Chen', 'emily.c@school.edu', 'Mathematics', '(555) 101-0002', '👩‍🏫', 'active', '[2, 6]'),
  (18, 'Dr. Robert Kim', 'robert.k@school.edu', 'Science', '(555) 101-0003', '👨‍🏫', 'away', '[3, 7]'),
  (19, 'Prof. James Wilson', 'james.w@school.edu', 'English', '(555) 101-0004', '👨‍🏫', 'active', '[4, 8]')
ON CONFLICT (id) DO NOTHING;

-- Seed Students
INSERT INTO students (id, name, grade, subject, teacher, total_hours, used_hours, days_attended, total_days, payment_status, payment_amount, completion_status, parent_name, parent_email, enrolled_date, parent_id, avatar) VALUES
  (1, 'Emma Thompson', 'Grade 5', 'English', 'Dr. Sarah Mitchell', 30, 22, 18, 30, 'paid', 450, 'active', 'Michael Thompson', 'michael.t@email.com', '2026-03-15', 101, '👧'),
  (2, 'Lucas Chen', 'Grade 6', 'Mathematics', 'Ms. Emily Chen', 20, 8, 6, 20, 'paid', 300, 'active', 'Sarah Chen', 'sarah.c@email.com', '2026-04-10', 102, '👦'),
  (3, 'Sophia Martinez', 'Grade 5', 'Science', 'Dr. Robert Kim', 40, 40, 36, 40, 'paid', 600, 'completed', 'Carlos Martinez', 'carlos.m@email.com', '2026-01-05', 103, '👧'),
  (4, 'James Wilson', 'Grade 7', 'English', 'Prof. James Wilson', 25, 10, 8, 25, 'pending', 375, 'active', 'Lisa Wilson', 'lisa.w@email.com', '2026-04-22', 104, '👦'),
  (5, 'Olivia Brown', 'Grade 6', 'Mathematics', 'Dr. Sarah Mitchell', 35, 35, 32, 35, 'paid', 525, 'completed', 'David Brown', 'david.b@email.com', '2026-02-18', 105, '👧'),
  (6, 'Mason Taylor', 'Grade 4', 'English', 'Ms. Emily Chen', 15, 3, 2, 15, 'paid', 225, 'active', 'Amanda Taylor', 'amanda.t@email.com', '2026-05-01', 106, '👦'),
  (7, 'Isabella Anderson', 'Grade 8', 'Science', 'Dr. Robert Kim', 30, 18, 15, 30, 'pending', 450, 'active', 'Robert Anderson', 'robert.a@email.com', '2026-03-28', 107, '👧'),
  (8, 'Ethan Williams', 'Grade 9', 'Mathematics', 'Prof. James Wilson', 50, 26, 22, 50, 'paid', 750, 'active', 'Jennifer Williams', 'jennifer.w@email.com', '2026-02-01', 108, '👦')
ON CONFLICT (id) DO NOTHING;

-- Seed Contacts
INSERT INTO contacts (id, name, role, email, subject, teacher, phone, avatar, status, last_active) VALUES
  (1, 'Emma Thompson', 'Student', 'emma.t@school.edu', 'English', 'Dr. Sarah Mitchell', '(555) 201-0101', '👧', 'active', 'Today'),
  (2, 'Lucas Chen', 'Student', 'lucas.c@school.edu', 'Mathematics', 'Ms. Emily Chen', '(555) 201-0102', '👦', 'active', 'Yesterday'),
  (3, 'Sophia Martinez', 'Student', 'sophia.m@school.edu', 'Science', 'Dr. Robert Kim', '(555) 201-0103', '👧', 'away', '2 days ago'),
  (4, 'James Wilson', 'Student', 'james.w@school.edu', 'English', 'Prof. James Wilson', '(555) 201-0104', '👦', 'active', 'Today'),
  (5, 'Olivia Brown', 'Student', 'olivia.b@school.edu', 'Mathematics', 'Dr. Sarah Mitchell', '(555) 201-0105', '👧', 'offline', '5 days ago'),
  (6, 'Mason Taylor', 'Student', 'mason.t@school.edu', 'English', 'Ms. Emily Chen', '(555) 201-0106', '👦', 'active', 'Today'),
  (7, 'Isabella Anderson', 'Student', 'isabella.a@school.edu', 'Science', 'Dr. Robert Kim', '(555) 201-0107', '👧', 'away', '1 day ago'),
  (8, 'Ethan Williams', 'Student', 'ethan.w@school.edu', 'Mathematics', 'Prof. James Wilson', '(555) 201-0108', '👦', 'active', 'Today'),
  (9, 'Michael Thompson', 'Parent', 'michael.t@email.com', 'English', NULL, '(555) 202-0101', '👨', 'active', 'Today'),
  (10, 'Sarah Chen', 'Parent', 'sarah.c@email.com', 'Mathematics', NULL, '(555) 202-0102', '👩', 'away', '3 days ago'),
  (11, 'Carlos Martinez', 'Parent', 'carlos.m@email.com', 'Science', NULL, '(555) 202-0103', '👨', 'active', 'Today'),
  (12, 'Lisa Wilson', 'Parent', 'lisa.w@email.com', 'English', NULL, '(555) 202-0104', '👩', 'offline', '1 week ago'),
  (13, 'David Brown', 'Parent', 'david.b@email.com', 'Mathematics', NULL, '(555) 202-0105', '👨', 'active', 'Yesterday'),
  (14, 'Amanda Taylor', 'Parent', 'amanda.t@email.com', 'English', NULL, '(555) 202-0106', '👩', 'active', 'Today'),
  (15, 'Robert Anderson', 'Parent', 'robert.a@email.com', 'Science', NULL, '(555) 202-0107', '👨', 'away', '2 days ago'),
  (16, 'Dr. Sarah Mitchell', 'Teacher', 'sarah.m@school.edu', 'English', NULL, '(555) 101-0001', '👩‍🏫', 'active', 'Today'),
  (17, 'Ms. Emily Chen', 'Teacher', 'emily.c@school.edu', 'Mathematics', NULL, '(555) 101-0002', '👩‍🏫', 'active', 'Today'),
  (18, 'Dr. Robert Kim', 'Teacher', 'robert.k@school.edu', 'Science', NULL, '(555) 101-0003', '👨‍🏫', 'away', 'Yesterday'),
  (19, 'Prof. James Wilson', 'Teacher', 'james.w@school.edu', 'English', NULL, '(555) 101-0004', '👨‍🏫', 'active', 'Today'),
  (20, 'Jennifer Williams', 'Parent', 'jennifer.w@email.com', 'Mathematics', NULL, '(555) 202-0108', '👩', 'offline', '4 days ago')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (optional, safe defaults)
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_room_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read policies (app is open-access for demo)
CREATE POLICY "Allow public read" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON contacts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated all" ON video_room_contacts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow individual user access" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Allow public insert" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON teachers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON contacts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete" ON contacts FOR DELETE USING (true);
