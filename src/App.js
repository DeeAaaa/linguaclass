import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { createPeerConnection, addTracksToPeer, replaceVideoTrack, createOffer, handleOffer, handleAnswer, handleIceCandidate, closePeer } from './webrtc';
import { supabase, signIn, signOut, getSession, signInLocal, fetchTeachers, updateTeacher, fetchStudents, fetchContacts, saveContacts, fetchVideoRoomContacts, addVideoRoomContact, removeVideoRoomContact } from './supabase';
import { LoginForm } from './auth/AuthForms';
import { joinSignalingRoom } from './signaling';

// ============================================
// AUTH CONTEXT
// ============================================
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('classroom_user');
    if (saved) return JSON.parse(saved);
    return null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('classroom_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('classroom_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// SAMPLE DATA
// ============================================
const SAMPLE_SCHEDULES = [
  { id: 1, date: '2026-05-20', time: '09:00', title: 'Advanced English Grammar', subject: 'English', type: 'live', teacher: 'Dr. Sarah Mitchell' },
  { id: 2, date: '2026-05-20', time: '11:30', title: 'Business Writing Workshop', subject: 'English', type: 'recorded', teacher: 'Prof. James Wilson' },
  { id: 3, date: '2026-05-21', time: '10:00', title: 'Speaking Practice Session', subject: 'English', type: 'live', teacher: 'Ms. Emily Chen' },
  { id: 4, date: '2026-05-22', time: '14:00', title: 'Academic Reading', subject: 'English', type: 'live', teacher: 'Dr. Sarah Mitchell' },
];

const SAMPLE_FILES = [
  { id: 1, name: 'Grammar Essentials.pdf', type: 'pdf', size: '2.4 MB', date: '2026-05-15', category: 'materials' },
  { id: 2, name: 'Business Letters Template.docx', type: 'doc', size: '156 KB', date: '2026-05-14', category: 'templates' },
  { id: 3, name: 'Pronunciation Guide.mp4', type: 'video', size: '45 MB', date: '2026-05-13', category: 'recordings' },
  { id: 4, name: 'Vocabulary List.xlsx', type: 'excel', size: '89 KB', date: '2026-05-12', category: 'materials' },
];

const SAMPLE_CONTACTS = [
  { id: 1, name: 'Emma Thompson', role: 'Student', email: 'emma.t@school.edu', subject: 'English', teacher: 'Dr. Sarah Mitchell', phone: '(555) 201-0101', avatar: '👧', status: 'active', lastActive: 'Today' },
  { id: 2, name: 'Lucas Chen', role: 'Student', email: 'lucas.c@school.edu', subject: 'Mathematics', teacher: 'Ms. Emily Chen', phone: '(555) 201-0102', avatar: '👦', status: 'active', lastActive: 'Yesterday' },
  { id: 3, name: 'Sophia Martinez', role: 'Student', email: 'sophia.m@school.edu', subject: 'Science', teacher: 'Dr. Robert Kim', phone: '(555) 201-0103', avatar: '👧', status: 'away', lastActive: '2 days ago' },
  { id: 4, name: 'James Wilson', role: 'Student', email: 'james.w@school.edu', subject: 'English', teacher: 'Prof. James Wilson', phone: '(555) 201-0104', avatar: '👦', status: 'active', lastActive: 'Today' },
  { id: 5, name: 'Olivia Brown', role: 'Student', email: 'olivia.b@school.edu', subject: 'Mathematics', teacher: 'Dr. Sarah Mitchell', phone: '(555) 201-0105', avatar: '👧', status: 'offline', lastActive: '5 days ago' },
  { id: 6, name: 'Mason Taylor', role: 'Student', email: 'mason.t@school.edu', subject: 'English', teacher: 'Ms. Emily Chen', phone: '(555) 201-0106', avatar: '👦', status: 'active', lastActive: 'Today' },
  { id: 7, name: 'Isabella Anderson', role: 'Student', email: 'isabella.a@school.edu', subject: 'Science', teacher: 'Dr. Robert Kim', phone: '(555) 201-0107', avatar: '👧', status: 'away', lastActive: '1 day ago' },
  { id: 8, name: 'Ethan Williams', role: 'Student', email: 'ethan.w@school.edu', subject: 'Mathematics', teacher: 'Prof. James Wilson', phone: '(555) 201-0108', avatar: '👦', status: 'active', lastActive: 'Today' },
  { id: 9, name: 'Michael Thompson', role: 'Parent', email: 'michael.t@email.com', subject: 'English', student: 'Emma Thompson', phone: '(555) 202-0101', avatar: '👨', status: 'active', lastActive: 'Today' },
  { id: 10, name: 'Sarah Chen', role: 'Parent', email: 'sarah.c@email.com', subject: 'Mathematics', student: 'Lucas Chen', phone: '(555) 202-0102', avatar: '👩', status: 'away', lastActive: '3 days ago' },
  { id: 11, name: 'Carlos Martinez', role: 'Parent', email: 'carlos.m@email.com', subject: 'Science', student: 'Sophia Martinez', phone: '(555) 202-0103', avatar: '👨', status: 'active', lastActive: 'Today' },
  { id: 12, name: 'Lisa Wilson', role: 'Parent', email: 'lisa.w@email.com', subject: 'English', student: 'James Wilson', phone: '(555) 202-0104', avatar: '👩', status: 'offline', lastActive: '1 week ago' },
  { id: 13, name: 'David Brown', role: 'Parent', email: 'david.b@email.com', subject: 'Mathematics', student: 'Olivia Brown', phone: '(555) 202-0105', avatar: '👨', status: 'active', lastActive: 'Yesterday' },
  { id: 14, name: 'Amanda Taylor', role: 'Parent', email: 'amanda.t@email.com', subject: 'English', student: 'Mason Taylor', phone: '(555) 202-0106', avatar: '👩', status: 'active', lastActive: 'Today' },
  { id: 15, name: 'Robert Anderson', role: 'Parent', email: 'robert.a@email.com', subject: 'Science', student: 'Isabella Anderson', phone: '(555) 202-0107', avatar: '👨', status: 'away', lastActive: '2 days ago' },
  { id: 16, name: 'Dr. Sarah Mitchell', role: 'Teacher', email: 'sarah.m@school.edu', subject: 'English', students: 3, phone: '(555) 101-0001', avatar: '👩‍🏫', status: 'active', lastActive: 'Today' },
  { id: 17, name: 'Ms. Emily Chen', role: 'Teacher', email: 'emily.c@school.edu', subject: 'Mathematics', students: 2, phone: '(555) 101-0002', avatar: '👩‍🏫', status: 'active', lastActive: 'Today' },
  { id: 18, name: 'Dr. Robert Kim', role: 'Teacher', email: 'robert.k@school.edu', subject: 'Science', students: 2, phone: '(555) 101-0003', avatar: '👨‍🏫', status: 'away', lastActive: 'Yesterday' },
  { id: 19, name: 'Prof. James Wilson', role: 'Teacher', email: 'james.w@school.edu', subject: 'English', students: 2, phone: '(555) 101-0004', avatar: '👨‍🏫', status: 'active', lastActive: 'Today' },
  { id: 20, name: 'Jennifer Williams', role: 'Parent', email: 'jennifer.w@email.com', subject: 'Mathematics', student: 'Ethan Williams', phone: '(555) 202-0108', avatar: '👩', status: 'offline', lastActive: '4 days ago' },
];

// Teacher management: which teacher is assigned which students
const SAMPLE_TEACHERS = [
  { id: 16, name: 'Dr. Sarah Mitchell', email: 'sarah.m@school.edu', subject: 'English', phone: '(555) 101-0001', avatar: '👩‍🏫', status: 'active', assignedStudentIds: [1, 5] },
  { id: 17, name: 'Ms. Emily Chen', email: 'emily.c@school.edu', subject: 'Mathematics', phone: '(555) 101-0002', avatar: '👩‍🏫', status: 'active', assignedStudentIds: [2, 6] },
  { id: 18, name: 'Dr. Robert Kim', email: 'robert.k@school.edu', subject: 'Science', phone: '(555) 101-0003', avatar: '👨‍🏫', status: 'away', assignedStudentIds: [3, 7] },
  { id: 19, name: 'Prof. James Wilson', email: 'james.w@school.edu', subject: 'English', phone: '(555) 101-0004', avatar: '👨‍🏫', status: 'active', assignedStudentIds: [4, 8] },
];

const ANNOUNCEMENTS = [
  { id: 1, title: 'New Speaking Course Available', content: 'Join our Advanced Speaking Skills course starting next week. Limited spots!', date: '2026-05-19' },
  { id: 2, title: 'Holiday Schedule', content: 'No classes on Friday due to national holiday. Enjoy your long weekend!', date: '2026-05-18' },
];

// Student and Parent Management Data
const SAMPLE_STUDENTS = [
  { id: 1, name: 'Emma Thompson', grade: 'Grade 5', subject: 'English', teacher: 'Dr. Sarah Mitchell', totalHours: 30, usedHours: 22, daysAttended: 18, totalDays: 30, paymentStatus: 'paid', paymentAmount: 450, completionStatus: 'active', parentName: 'Michael Thompson', parentEmail: 'michael.t@email.com', enrolledDate: '2026-03-15', parentId: 101, avatar: '👧', scheduleDay: 'Monday, Wednesday, Friday', scheduleTime: 'Morning 8:00 - 10:00 AM' },
  { id: 2, name: 'Lucas Chen', grade: 'Grade 6', subject: 'Mathematics', teacher: 'Ms. Emily Chen', totalHours: 20, usedHours: 8, daysAttended: 6, totalDays: 20, paymentStatus: 'paid', paymentAmount: 300, completionStatus: 'active', parentName: 'Sarah Chen', parentEmail: 'sarah.c@email.com', enrolledDate: '2026-04-10', parentId: 102, avatar: '👦', scheduleDay: 'Tuesday, Thursday', scheduleTime: 'Afternoon 2:00 - 4:00 PM' },
  { id: 3, name: 'Sophia Martinez', grade: 'Grade 5', subject: 'Science', teacher: 'Dr. Robert Kim', totalHours: 40, usedHours: 40, daysAttended: 36, totalDays: 40, paymentStatus: 'paid', paymentAmount: 600, completionStatus: 'completed', parentName: 'Carlos Martinez', parentEmail: 'carlos.m@email.com', enrolledDate: '2026-01-05', parentId: 103, avatar: '👧', scheduleDay: 'Monday to Friday', scheduleTime: 'Morning 7:00 - 8:30 AM' },
  { id: 4, name: 'James Wilson', grade: 'Grade 7', subject: 'English', teacher: 'Prof. James Wilson', totalHours: 25, usedHours: 10, daysAttended: 8, totalDays: 25, paymentStatus: 'pending', paymentAmount: 375, completionStatus: 'active', parentName: 'Lisa Wilson', parentEmail: 'lisa.w@email.com', enrolledDate: '2026-04-22', parentId: 104, avatar: '👦', scheduleDay: 'Saturday, Sunday', scheduleTime: 'Morning 9:00 - 11:00 AM' },
  { id: 5, name: 'Olivia Brown', grade: 'Grade 6', subject: 'Mathematics', teacher: 'Dr. Sarah Mitchell', totalHours: 35, usedHours: 35, daysAttended: 32, totalDays: 35, paymentStatus: 'paid', paymentAmount: 525, completionStatus: 'completed', parentName: 'David Brown', parentEmail: 'david.b@email.com', enrolledDate: '2026-02-18', parentId: 105, avatar: '👧', scheduleDay: 'Wednesday, Friday', scheduleTime: 'Evening 6:00 - 8:00 PM' },
  { id: 6, name: 'Mason Taylor', grade: 'Grade 4', subject: 'English', teacher: 'Ms. Emily Chen', totalHours: 15, usedHours: 3, daysAttended: 2, totalDays: 15, paymentStatus: 'paid', paymentAmount: 225, completionStatus: 'active', parentName: 'Amanda Taylor', parentEmail: 'amanda.t@email.com', enrolledDate: '2026-05-01', parentId: 106, avatar: '👦', scheduleDay: 'Monday, Thursday', scheduleTime: 'Afternoon 3:00 - 5:00 PM' },
  { id: 7, name: 'Isabella Anderson', grade: 'Grade 8', subject: 'Science', teacher: 'Dr. Robert Kim', totalHours: 30, usedHours: 18, daysAttended: 15, totalDays: 30, paymentStatus: 'pending', paymentAmount: 450, completionStatus: 'active', parentName: 'Robert Anderson', parentEmail: 'robert.a@email.com', enrolledDate: '2026-03-28', parentId: 107, avatar: '👧', scheduleDay: 'Tuesday, Thursday, Saturday', scheduleTime: 'Morning 10:00 AM - 12:00 PM' },
  { id: 8, name: 'Ethan Williams', grade: 'Grade 9', subject: 'Mathematics', teacher: 'Prof. James Wilson', totalHours: 50, usedHours: 26, daysAttended: 22, totalDays: 50, paymentStatus: 'paid', paymentAmount: 750, completionStatus: 'active', parentName: 'Jennifer Williams', parentEmail: 'jennifer.w@email.com', enrolledDate: '2026-02-01', parentId: 108, avatar: '👦', scheduleDay: 'Monday to Friday', scheduleTime: 'Evening 7:00 - 9:00 PM' },
];

// Student Archives: Each entry contains past, present, and future activities for a student on a specific date
const SAMPLE_STUDENT_ARCHIVES = [
  // Emma Thompson's archives
  { id: 1, studentId: 1, date: '2026-05-15', 
    past: { activity: 'Completed Chapter 5 vocabulary quiz', score: 92, notes: 'Excellent performance on irregular verbs' },
    present: { activity: 'Business Writing Workshop', status: 'completed', teacher: 'Prof. James Wilson', notes: 'Practiced formal email writing' },
    future: { activity: 'Speaking Practice Session', scheduled: '14:00', teacher: 'Ms. Emily Chen', prep: 'Prepare 2-minute self-introduction' }
  },
  { id: 2, studentId: 1, date: '2026-05-18', 
    past: { activity: 'Reading comprehension exercise', score: 88, notes: 'Good understanding of main ideas' },
    present: { activity: 'Advanced Grammar Session', status: 'completed', teacher: 'Dr. Sarah Mitchell', notes: 'Covered conditional sentences' },
    future: { activity: 'Homework: Grammar exercises pages 45-50', scheduled: 'Due tomorrow', teacher: 'Dr. Sarah Mitchell', prep: 'Review conditional types' }
  },
  { id: 3, studentId: 1, date: '2026-05-19', 
    past: { activity: 'Group discussion on current events', score: 85, notes: 'Good participation, needs more confidence' },
    present: { activity: 'Currently in Speaking Practice', status: 'in-progress', teacher: 'Ms. Emily Chen', notes: 'Working on pronunciation' },
    future: { activity: 'Book report submission', scheduled: '2026-05-25', teacher: 'Dr. Sarah Mitchell', prep: 'Read chapters 10-15' }
  },
  // Lucas Chen's archives
  { id: 4, studentId: 2, date: '2026-05-15', 
    past: { activity: 'Grammar worksheet completion', score: 95, notes: 'Perfect score on verb conjugation' },
    present: { activity: 'Academic Reading Class', status: 'completed', teacher: 'Dr. Sarah Mitchell', notes: 'Analyzed two academic articles' },
    future: { activity: 'Online quiz preparation', scheduled: '2026-05-22', teacher: 'Prof. James Wilson', prep: 'Review chapters 1-4' }
  },
  { id: 5, studentId: 2, date: '2026-05-19', 
    past: { activity: 'Vocabulary building exercises', score: 90, notes: 'Strong performance in word usage' },
    present: { activity: 'Business Writing Workshop', status: 'completed', teacher: 'Prof. James Wilson', notes: 'Drafted professional cover letter' },
    future: { activity: 'Peer review session', scheduled: '10:00', teacher: 'Prof. James Wilson', prep: 'Review classmate drafts' }
  },
  // Sophia Martinez's archives
  { id: 6, studentId: 3, date: '2026-05-18', 
    past: { activity: 'Pronunciation practice', score: 78, notes: 'Working on th sound pronunciation' },
    present: { activity: 'Speaking Practice Session', status: 'completed', teacher: 'Ms. Emily Chen', notes: 'Significant improvement today' },
    future: { activity: 'Pronunciation recording assignment', scheduled: 'Due 2026-05-21', teacher: 'Ms. Emily Chen', prep: 'Practice tongue twisters' }
  },
  { id: 7, studentId: 3, date: '2026-05-19', 
    past: { activity: 'Grammar quiz preparation', score: 85, notes: 'Solid understanding of tenses' },
    present: { activity: 'Currently in Grammar Class', status: 'in-progress', teacher: 'Dr. Sarah Mitchell', notes: 'Learning subjunctive mood' },
    future: { activity: 'Writing assignment: Narrative essay', scheduled: 'Due 2026-05-24', teacher: 'Dr. Sarah Mitchell', prep: 'Outline draft by Friday' }
  },
  // James Wilson's archives
  { id: 8, studentId: 4, date: '2026-05-19', 
    past: { activity: 'Literature analysis essay', score: 88, notes: 'Good thesis development' },
    present: { activity: 'Advanced English Grammar', status: 'completed', teacher: 'Dr. Sarah Mitchell', notes: 'Covered complex sentence structures' },
    future: { activity: 'Study group meeting', scheduled: '16:00', teacher: 'Self-directed', prep: 'Prepare discussion points' }
  },
  // Olivia Brown's archives
  { id: 9, studentId: 5, date: '2026-05-19', 
    past: { activity: 'Reading comprehension test', score: 91, notes: 'Excellent inference skills' },
    present: { activity: 'Currently in Writing Workshop', status: 'in-progress', teacher: 'Prof. James Wilson', notes: 'Working on persuasive writing' },
    future: { activity: 'Presentation preparation', scheduled: '2026-05-23', teacher: 'Ms. Emily Chen', prep: 'Prepare 5-minute presentation slides' }
  },
];

// Featured Content
const FEATURED_CONTENT = [
  {
    id: 1,
    type: 'article',
    title: 'The Art of Effective Communication',
    excerpt: 'Master the fundamentals of clear and impactful communication in both professional and personal settings.',
    author: 'Dr. Sarah Mitchell',
    readTime: '8 min read',
    category: 'Communication',
    image: 'https://picsum.photos/seed/comm1/400/250',
    date: '2026-05-15',
    url: ''
  },
  {
    id: 2,
    type: 'video',
    title: 'Business English Essentials',
    excerpt: 'Learn key phrases and vocabulary for workplace communication, meetings, and presentations.',
    author: 'Prof. James Wilson',
    duration: '15:30',
    category: 'Business',
    image: 'https://picsum.photos/seed/biz1/400/250',
    date: '2026-05-14'
  },
  {
    id: 3,
    type: 'story',
    title: 'The Lighthouse Keeper',
    excerpt: 'A captivating short story about perseverance and hope during challenging times.',
    author: 'Classic Literature',
    readTime: '12 min read',
    category: 'Literature',
    image: 'https://picsum.photos/seed/lighthouse/400/250',
    date: '2026-05-10'
  },
  {
    id: 4,
    type: 'book',
    title: '1984 by George Orwell',
    excerpt: 'A dystopian masterpiece exploring themes of surveillance, truth, and totalitarianism.',
    author: 'George Orwell',
    readTime: '9 chapters',
    category: 'Classic Fiction',
    image: 'https://picsum.photos/seed/1984book/400/250',
    date: 'Classic',
    url: ''
  },
  {
    id: 5,
    type: 'article',
    title: 'Grammar Tips: Common Mistakes',
    excerpt: 'Avoid these 10 frequent grammar errors that even native speakers make.',
    author: 'Ms. Emily Chen',
    readTime: '5 min read',
    category: 'Grammar',
    image: 'https://picsum.photos/seed/grammar/400/250',
    date: '2026-05-18',
    url: ''
  },
  {
    id: 6,
    type: 'video',
    title: 'Pronunciation Masterclass',
    excerpt: 'Perfect your accent with these essential pronunciation exercises and techniques.',
    author: 'Dr. Sarah Mitchell',
    duration: '22:15',
    category: 'Speaking',
    image: 'https://picsum.photos/seed/pronun/400/250',
    date: '2026-05-12',
    url: ''
  },
];

const QUICK_LESSONS = [
  { id: 1, title: 'Present Perfect Tense', icon: '📝', progress: 75, lessons: 12, completed: 9 },
  { id: 2, title: 'Business Vocabulary', icon: '💼', progress: 45, lessons: 20, completed: 9 },
  { id: 3, title: 'Idioms & Expressions', icon: '💡', progress: 30, lessons: 15, completed: 5 },
];

const MAIN_SUBJECTS = [
  { id: 'english', name: 'English', icon: '📚', color: '#4f46e5', description: 'Grammar, Vocabulary & Literature' },
  { id: 'math', name: 'Mathematics', icon: '📐', color: '#059669', description: 'Algebra, Geometry & Calculus' },
  { id: 'science', name: 'Science', icon: '🔬', color: '#dc2626', description: 'Physics, Chemistry & Biology' },
];

const ACHIEVEMENTS = [
  { id: 1, title: 'First Steps', description: 'Complete your first class', icon: '🎯', unlocked: true },
  { id: 2, title: 'Quick Learner', description: 'Watch 5 videos', icon: '📺', unlocked: true },
  { id: 3, title: 'Bookworm', description: 'Read 3 articles', icon: '📚', unlocked: true },
  { id: 4, title: 'Discussion Star', description: 'Send 10 chat messages', icon: '💬', unlocked: false },
  { id: 5, title: 'Perfect Attendance', description: 'Attend 10 classes', icon: '🏆', unlocked: false },
  { id: 6, title: 'Language Master', description: 'Complete all lessons', icon: '⭐', unlocked: false },
];

// ============================================
// ICONS
// ============================================
const Icons = {
  Menu: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Video: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Files: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
  Mic: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  MicOff: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>,
  Camera: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  CameraOff: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/></svg>,
  Screen: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Phone: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Send: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
  Play: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>,
  Logout: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Globe: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Book: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Clock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  ChevronLeft: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>,
  ChevronRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>,
  ChevronDown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Upload: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Grid: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  List: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Translate: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2v3"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>,
  Whiteboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>,
  Brush: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 3L21 6"/><path d="M7 14L19 2"/><path d="M5 15c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z"/></svg>,
  Eraser: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-9 9-5-5 9-9z"/><path d="M15 3l6 6"/><path d="M2 22h20"/></svg>,
  Clear: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Save: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  StudentRecords: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>,
  Mail: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  PhoneCall: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Shield: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Eye: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Dollar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Microphone: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Speaker: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  StopBtn: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Link: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  People: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Contacts: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><line x1="15" y1="17" x2="23" y2="9"/><line x1="19" y1="9" x2="19" y2="17"/></svg>,
  Invite: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Circle: ({ color = '#10b981' }) => <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill={color}/></svg>,
  Admin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/><path d="M9 12l2 2 4-4"/></svg>,
  PlusCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  MinusCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  Classroom: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="lga" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="60%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="lgb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#60a5fa"/>
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lga)"/>
      <circle cx="60" cy="60" r="42" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none"/>
      <path d="M60 38L60 90Q60 80 48 74Q36 68 28 72Q20 76 20 82L20 84Q28 75 38 73Q48 71 54 76L54 42Q48 37 38 38Q28 39 20 45L20 42Q28 35 38 34Q48 33 54 37" fill="white" opacity="0.92"/>
      <path d="M60 38L60 90Q60 80 72 74Q84 68 92 72Q100 76 100 82L100 84Q92 75 82 73Q72 71 66 76L66 42Q72 37 82 38Q92 39 100 45L100 42Q92 35 82 34Q72 33 66 37" fill="white" opacity="0.85"/>
      <line x1="60" y1="38" x2="60" y2="88" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5"/>
      <line x1="32" y1="48" x2="50" y2="47" stroke="rgba(59,130,246,0.2)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="30" y1="55" x2="52" y2="54" stroke="rgba(59,130,246,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="30" y1="62" x2="50" y2="61" stroke="rgba(59,130,246,0.1)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="70" y1="47" x2="88" y2="48" stroke="rgba(139,92,246,0.2)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="68" y1="54" x2="90" y2="55" stroke="rgba(139,92,246,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="68" y1="61" x2="88" y2="62" stroke="rgba(139,92,246,0.1)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M42 26Q60 16 78 26" stroke="url(#lgb)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.9"/>
      <circle cx="50" cy="24" r="2.5" fill="white" opacity="0.75"/>
      <circle cx="60" cy="20" r="2.5" fill="white" opacity="0.75"/>
      <circle cx="70" cy="24" r="2.5" fill="white" opacity="0.75"/>
    </svg>
  ),
};

// ============================================
// LANDING PAGE
// ============================================
// ============================================
// TEACHER MANAGEMENT HELPERS (localStorage)
// ============================================
function getStoredTeachers() {
  try {
    return JSON.parse(localStorage.getItem('linguaclass_teachers') || '[]');
  } catch { return []; }
}
function saveStoredTeachers(teachers) {
  localStorage.setItem('linguaclass_teachers', JSON.stringify(teachers));
}

// STUDENT MANAGEMENT HELPERS (localStorage)
// ============================================
function getStoredStudents() {
  try {
    return JSON.parse(localStorage.getItem('linguaclass_students') || '[]');
  } catch { return []; }
}
function saveStoredStudents(students) {
  localStorage.setItem('linguaclass_students', JSON.stringify(students));
}

// Get ALL students (merged: sample + any locally persisted)
function getAllStudents() {
  const stored = getStoredStudents();
  // Merge stored students into sample data, preferring stored versions
  const merged = [...SAMPLE_STUDENTS];
  stored.forEach(ss => {
    const idx = merged.findIndex(s => s.id === ss.id);
    if (idx >= 0) {
      merged[idx] = ss;
    } else {
      merged.push(ss);
    }
  });
  return merged;
}

// Get students filtered for a specific parent
function getStudentsByParentId(parentId) {
  return getAllStudents().filter(s => s.parentId === parentId);
}

// Get students filtered by parent email
function getStudentsByParentEmail(parentEmail) {
  if (!parentEmail) return [];
  const email = parentEmail.toLowerCase();
  return getAllStudents().filter(s =>
    (s.parentEmail && s.parentEmail.toLowerCase() === email)
  );
}

// ============================================
// ADMIN MASTER CREDENTIALS
// ============================================
const ADMIN_EMAIL = 'admin@linguaclass.com';
const ADMIN_PASSWORD = 'LinguaAdmin2026';

function LanguageSwitcher() {
  const { lang, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'zh', flag: '🇨🇳', label: '中文' },
    { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  ];

  const current = languages.find(l => l.code === lang) || languages[0];

  return (
    <div className="lang-switcher-wrapper" ref={ref}>
      <button className="lang-switcher-btn" onClick={() => setOpen(!open)}>
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-current">{current.label}</span>
        <span className="lang-caret">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          {languages.map(l => (
            <button
              key={l.code}
              className={`lang-option ${l.code === lang ? 'active' : ''}`}
              onClick={() => { setLanguage(l.code); setOpen(false); }}
            >
              <span className="lang-flag">{l.flag}</span>
              <span className="lang-label">{l.label}</span>
              {l.code === lang && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LandingPage({ onLogin }) {
  const { t } = useTranslation();
  const [showLogin, setShowLogin] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAnnouncement(prev => (prev + 1) % ANNOUNCEMENTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Called after successful login for family
  const handleLoginSuccess = (userData) => {
    onLogin(userData);
  };

  // Teacher login flow
  const handleTeacherLogin = async (identifier, password) => {
    const teachers = getStoredTeachers();
    const matched = teachers.find(t =>
      t.email.toLowerCase() === identifier.toLowerCase() &&
      t.password === password &&
      t.status !== 'inactive'
    );
    if (matched) {
      onLogin({
        name: matched.name,
        email: matched.email,
        role: 'teacher',
        id: matched.id,
        phone: matched.phone || '',
        subject: matched.subject
      });
      return true;
    }
    // Try Supabase/local
    try {
      const result = await signInLocal(identifier, password);
      if (result.profile && result.profile.role === 'teacher') {
        result.profile.phone = result.profile.phone || '';
        onLogin(result.profile);
        return true;
      }
    } catch (e) { /* fall through */ }
    return false;
  };

  // Admin login
  const handleAdminLogin = () => {
    onLogin({
      name: 'Administrator',
      email: ADMIN_EMAIL,
      role: 'admin',
      id: 0,
      phone: ''
    });
  };

  // Login role: null = not chosen, 'administrator' | 'family'
  const [loginRole, setLoginRole] = useState(null);
  // Sub-role for administrator: null = choose, 'admin' | 'teacher'
  const [adminSubRole, setAdminSubRole] = useState(null);

  // Reset login state when going back
  const goBack = () => {
    if (adminSubRole) {
      setAdminSubRole(null);
    } else if (loginRole) {
      setLoginRole(null);
    } else {
      setShowLogin(false);
    }
  };

  // Render the current auth step
  const renderAuthStep = () => {
    if (!showLogin) {
      return (
        <button className="btn-auth-choice btn-auth-login hero-login-btn" onClick={() => setShowLogin(true)}>
          <span className="choice-icon">🔑</span>
          <span className="choice-title">{t('signIn') || 'Login'}</span>
          <span className="choice-desc">{t('signInDesc') || 'Sign in to your account'}</span>
        </button>
      );
    }

    // --- Choose: Administrator or Family ---
    if (!loginRole) {
      return (
        <div className="auth-choice-buttons auth-login-roles">
          <h3 className="login-role-title">{'Choose your login method'}</h3>

          <button className="btn-auth-choice btn-admin-login" onClick={() => setLoginRole('administrator')}>
            <span className="choice-icon">🛡️</span>
            <span className="choice-title">Administrator</span>
            <span className="choice-desc">Admin & Teacher access</span>
          </button>

          <button className="btn-auth-choice btn-family-login" onClick={() => setLoginRole('family')}>
            <span className="choice-icon">🏠</span>
            <span className="choice-title">Family</span>
            <span className="choice-desc">View your family calendar, files, and children's progress</span>
          </button>

          <button className="auth-back-main" onClick={() => setShowLogin(false)}>
            ← Back
          </button>
        </div>
      );
    }

    // --- Administrator: choose Admin or Teacher ---
    if (loginRole === 'administrator' && !adminSubRole) {
      return (
        <div className="auth-choice-buttons auth-login-roles">
          <h3 className="login-role-title">Administrator Access</h3>

          <button className="btn-auth-choice btn-admin-login" onClick={() => setAdminSubRole('admin')}>
            <span className="choice-icon">🛡️</span>
            <span className="choice-title">Admin</span>
            <span className="choice-desc">Full system access — manage everything</span>
          </button>

          <button className="btn-auth-choice btn-teacher-login" onClick={() => setAdminSubRole('teacher')}>
            <span className="choice-icon">👩‍🏫</span>
            <span className="choice-title">Teacher</span>
            <span className="choice-desc">Access students, calendar, video room & calls</span>
          </button>

          <button className="auth-back-main" onClick={goBack}>
            ← Back
          </button>
        </div>
      );
    }

    // --- Admin login form ---
    if (loginRole === 'administrator' && adminSubRole === 'admin') {
      return (
        <LoginForm
          t={t}
          role="admin"
          onSuccess={handleAdminLogin}
          onBack={goBack}
        />
      );
    }

    // --- Teacher login form ---
    if (loginRole === 'administrator' && adminSubRole === 'teacher') {
      return (
        <LoginForm
          t={t}
          role="teacher"
          onSuccess={handleTeacherLogin}
          onBack={goBack}
        />
      );
    }

    // --- Family login form ---
    if (loginRole === 'family') {
      return (
        <LoginForm
          t={t}
          role="family"
          onSuccess={handleLoginSuccess}
          onBack={goBack}
        />
      );
    }

    return null;
  };

  return (
    <div className="landing">
      {/* Clean Navigation */}
      <nav className="landing-nav">
        <div className="nav-left">
          <div className="landing-logo">
            <Icons.Classroom size={36} />
            <span>{t('brand')}</span>
          </div>
        </div>
        <div className="nav-right">
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Hero Section */}
      <div className="landing-hero">
        <div className="hero-content">
          <h1>{t('landingTitle')}</h1>
          <p>{t('landingSubtitle')}</p>

          {/* Auth Step Container */}
          <div className="hero-register-form">
            {renderAuthStep()}
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="visual-card">
            <div className="visual-header">
              <div className="visual-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div className="visual-content">
              <div className="video-preview">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=300&fit=crop" alt="Students learning" />
                <div className="video-overlay">
                  <span className="live-indicator">{t('liveClass')}</span>
                </div>
              </div>
              <div className="visual-info">
                <h4>{t('advEnglishGrammar')}</h4>
                <p>Dr. Sarah Mitchell • {t('studentsCount')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2>{t('everythingYouNeed')}</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Icons.Video /></div>
            <h3>{t('liveVideoClasses')}</h3>
            <p>{t('liveVideoClassesDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Icons.Files /></div>
            <h3>{t('resourceLibrary')}</h3>
            <p>{t('resourceLibraryDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Icons.Calendar /></div>
            <h3>{t('smartScheduling')}</h3>
            <p>{t('smartSchedulingDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Icons.Globe /></div>
            <h3>{t('multiLanguageSupport')}</h3>
            <p>{t('multiLanguageSupportDesc')}</p>
          </div>
        </div>
      </div>

      {/* Get the App Section */}
      <section className="get-app-section" id="get-app">
        <div className="get-app-header">
          <div className="get-app-badge">{t('getTheApp')}</div>
          <h2>{t('getTheAppTitle')}</h2>
          <p className="get-app-sub">{t('getTheAppSubtitle')}</p>
        </div>

        {/* Platform Download Cards */}
        <div className="download-cards">
          <div className="download-card">
            <div className="dc-icon">🤖</div>
            <h3>{t('downloadForAndroid')}</h3>
            <p className="dc-desc">{t('downloadAPKDesc')}</p>
            <div className="dc-buttons">
              <a href="https://github.com/DeeAaaa/linguaclass/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-download-apk">
                <Icons.Classroom size={18} /> {t('downloadAPKFromGithub')}
              </a>
              <button className="btn-download-apk-secondary" onClick={() => {
                const evt = new Event('trigger-pwa-install');
                window.dispatchEvent(evt);
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> {t('installNow')}
              </button>
            </div>
          </div>
          <div className="download-card">
            <div className="dc-icon">🍎</div>
            <h3>{t('downloadForIOS')}</h3>
            <p className="dc-desc">{t('installIOSStep')}</p>
            <div className="dc-buttons">
              <button className="btn-install-app" id="landing-install-btn" onClick={() => {
                const evt = new Event('trigger-pwa-install');
                window.dispatchEvent(evt);
              }}>
                <Icons.Classroom size={18} /> {t('installNow')}
              </button>
              <span className="dc-note">{t('scanQR')} ↓</span>
            </div>
          </div>
          <div className="download-card">
            <div className="dc-icon">💻</div>
            <h3>{t('downloadDesktopApp')}</h3>
            <p className="dc-desc">{t('installDesktopStep')}</p>
            <div className="dc-buttons">
              <button className="btn-install-app btn-install-desktop" onClick={() => {
                const evt = new Event('trigger-pwa-install');
                window.dispatchEvent(evt);
              }}>
                <Icons.Classroom size={18} /> {t('installNow')}
              </button>
            </div>
          </div>
        </div>

        {/* APK Download / QR Section */}
        <div className="apk-download-area" id="apk-download">
          <div className="apk-info">
            <h3>{t('downloadAPK')}</h3>
            <p>{t('downloadAPKComing')}</p>
            <a href="https://github.com/DeeAaaa/linguaclass/releases/latest" target="_blank" rel="noopener noreferrer" className="btn-download-apk btn-download-apk-big">
              <Icons.Classroom size={22} /> {t('downloadAPKFromGithub')}
            </a>
            <p style={{marginTop:8,fontSize:'0.78rem',color:'#94a3b8'}}>{t('downloadAPKSize')}</p>
            <div className="apk-features">
              <div className="get-app-feature">
                <span className="gaf-icon">📴</span>
                <div><strong>{t('featuresOffline')}</strong><span>{t('featuresOfflineDesc')}</span></div>
              </div>
              <div className="get-app-feature">
                <span className="gaf-icon">⚡</span>
                <div><strong>{t('featuresFast')}</strong><span>{t('featuresFastDesc')}</span></div>
              </div>
              <div className="get-app-feature">
                <span className="gaf-icon">🖥️</span>
                <div><strong>{t('featuresFullscreen')}</strong><span>{t('featuresFullscreenDesc')}</span></div>
              </div>
              <div className="get-app-feature">
                <span className="gaf-icon">🔔</span>
                <div><strong>{t('featuresNotifications')}</strong><span>{t('featuresNotificationsDesc')}</span></div>
              </div>
            </div>
          </div>
          <div className="apk-visual">
            <div className="apk-qr-box">
              <div className="qr-placeholder">
                <Icons.Classroom size={80} />
              </div>
              <span>{t('scanQR')}</span>
            </div>
            <div className="apk-mockup">
              <div className="app-mockup">
                <div className="mockup-screen">
                  <div className="mockup-statusbar">
                    <span>9:41</span>
                    <span>●●●●○ &nbsp;WiFi</span>
                  </div>
                  <div className="mockup-app-icon">
                    <Icons.Classroom size={44} />
                  </div>
                  <div className="mockup-app-name">Linguaclass</div>
                  <div className="mockup-app-desc">{t('landingTitle')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Install Guides */}
        <div className="install-guides">
          <div className="install-guide">
            <div className="guide-platform">🍎 {t('installIOS')}</div>
            <div className="guide-step">{t('installIOSStep')}</div>
          </div>
          <div className="install-guide">
            <div className="guide-platform">🤖 {t('installAndroid')}</div>
            <div className="guide-step">{t('installAndroidStep')}</div>
          </div>
          <div className="install-guide">
            <div className="guide-platform">💻 {t('installDesktop')}</div>
            <div className="guide-step">{t('installDesktopStep')}</div>
          </div>
        </div>
      </section>

      <div className="announcement-bar">
        <div className="announcement-content">
          <span className="announcement-label">{t('latest')}</span>
          <p>{ANNOUNCEMENTS[activeAnnouncement]?.content}</p>
        </div>
        <div className="announcement-dots">
          {ANNOUNCEMENTS.map((_, i) => (
            <span key={i} className={i === activeAnnouncement ? 'active' : ''}></span>
          ))}
        </div>
      </div>

      <footer className="landing-footer">
        <p>{t('copyright')}</p>
      </footer>
    </div>
  );
}

// ============================================
// APP LAYOUT
// ============================================
function AppLayout({ children, user, onLogout, onLogin, currentPage, setCurrentPage }) {
  const { t, lang, toggleLanguage } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [familyLoginOpen, setFamilyLoginOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', checkMobile);
    checkMobile();
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isAdminUser = user?.role === 'admin';
  const isTeacherUser = user?.role === 'teacher';
  const isFamilyUser = user?.role === 'parent' || user?.role === 'student';

  // Admin: everything | Teacher: no admin tab | Family: only dashboard, calendar, files
  // No user: show Dashboard so sidebar isn't completely empty
  const navItems = !user
    ? [
        { id: 'dashboard', icon: Icons.Dashboard, label: t('navDashboard') },
      ]
    : isFamilyUser
    ? [
        { id: 'dashboard', icon: Icons.Dashboard, label: t('navDashboard') },
        { id: 'calendar', icon: Icons.Calendar, label: t('navCalendar') },
        { id: 'files', icon: Icons.Files, label: t('navFiles') },
      ]
    : isTeacherUser
    ? [
        { id: 'dashboard', icon: Icons.Dashboard, label: t('navDashboard') },
        { id: 'calendar', icon: Icons.Calendar, label: t('navCalendar') },
        { id: 'studentrecords', icon: Icons.StudentRecords, label: t('navStudentRecords') },
        { id: 'files', icon: Icons.Files, label: t('navFiles') },
        { id: 'video', icon: Icons.Video, label: t('navVideoRoom') },
        { id: 'admin', icon: Icons.Admin, label: t('navAdmin') },
      ]
    : [
        { id: 'dashboard', icon: Icons.Dashboard, label: t('navDashboard') },
        { id: 'calendar', icon: Icons.Calendar, label: t('navCalendar') },
        { id: 'studentrecords', icon: Icons.StudentRecords, label: t('navStudentRecords') },
        { id: 'files', icon: Icons.Files, label: t('navFiles') },
        { id: 'video', icon: Icons.Video, label: t('navVideoRoom') },
        { id: 'admin', icon: Icons.Admin, label: t('navAdmin') },
      ];

  // Bottom tab items (fewer, primary actions for mobile)
  const bottomTabs = [
    { id: 'dashboard', icon: Icons.Dashboard, label: t('navDashboard') },
    { id: 'calendar', icon: Icons.Calendar, label: t('navCalendar') },
    { id: 'video', icon: Icons.Video, label: t('navVideoRoom') },
  ];

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Icons.Classroom size={28} />
            <span>{t('brand')}</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Icons.Menu />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => { setCurrentPage(item.id); setMobileMenuOpen(false); }}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Guest login buttons — Administrator & Family */}
        {!user && (
          <div className="sidebar-login-actions">
            <button
              className="sidebar-login-btn admin-login-btn"
              onClick={() => {
                onLogin?.({ name: 'Administrator', email: 'admin@linguaclass.com', role: 'admin', id: 0, phone: '' });
                setMobileMenuOpen(false);
              }}
            >
              <span className="slb-icon">🛡️</span>
              <span>Administrator</span>
            </button>
            <button
              className="sidebar-login-btn family-login-btn"
              onClick={() => {
                setFamilyLoginOpen(true);
                setMobileMenuOpen(false);
              }}
            >
              <span className="slb-icon">🏠</span>
              <span>Family</span>
            </button>
          </div>
        )}

        {/* Sidebar Footer — Login when guest, Logout when logged in */}
        <div className="sidebar-footer">
          {user ? (
            <>
              <div className="user-info">
                <div className="user-avatar">
                  <Icons.User />
                </div>
                <div className="user-details">
                  <p className="user-name">{user.name || t('student')}</p>
                  <p className="user-role">{t(user.role) || t('student')}</p>
                </div>
              </div>
              <button className="logout-btn" onClick={onLogout} title="Logout">
                <Icons.Logout />
                <span className="logout-label">Logout</span>
              </button>
            </>
          ) : (
            <div className="sidebar-guest-footer">
              <Icons.User />
              <span>Login</span>
            </div>
          )}
        </div>

        <button className="mobile-close" onClick={() => setMobileMenuOpen(false)}>
          <Icons.X />
        </button>
      </aside>

      {/* Family Login Overlay */}
      {familyLoginOpen && (
        <div className="family-login-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFamilyLoginOpen(false); }}>
          <div className="family-login-modal">
            <button className="flm-close" onClick={() => setFamilyLoginOpen(false)}>✕</button>
            <h3>Family Login</h3>
            <p className="flm-sub">Sign in to view calendar & progress</p>
            <LoginForm
              t={t}
              role="family"
              onSuccess={(data) => {
                onLogin?.(data);
                setFamilyLoginOpen(false);
              }}
              onBack={() => setFamilyLoginOpen(false)}
            />
          </div>
        </div>
      )}

      <main className="main-content">
        <header className="top-bar">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <Icons.Menu />
          </button>
          <h1 className="page-title">
            {navItems.find(item => item.id === currentPage)?.label || t('navDashboard')}
          </h1>
          <div className="header-actions">
            <LanguageSwitcher />
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>

      {mobileMenuOpen && <div className="overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* ---- Bottom Tab Bar (mobile only) ---- */}
      {isMobile && (
        <nav className="bottom-tabs">
          {bottomTabs.map(tab => (
            <button
              key={tab.id}
              className={`bottom-tab ${currentPage === tab.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(tab.id)}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
          <button
            className="bottom-tab bottom-tab-menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icons.Menu />
            <span>Menu</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// ============================================
// CONTENT MANAGER - localStorage-backed CMS
// ============================================
function useContentManager() {
  const load = (key, fallback) => {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
  };
  const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

  const [schedules, setSchedules] = useState(() => load('cms_schedules', SAMPLE_SCHEDULES));
  const [featuredContent, setFeaturedContent] = useState(() => load('cms_featured', FEATURED_CONTENT));
  const [achievements, setAchievements] = useState(() => load('cms_achievements', ACHIEVEMENTS));
  const [quickLessons, setQuickLessons] = useState(() => load('cms_lessons', QUICK_LESSONS));
  const [readingItems, setReadingItems] = useState(() => load('cms_reading', [
    { id: 'r1', title: 'The Power of Reading', desc: 'Discover how daily reading transforms your language skills and opens new worlds of knowledge.', image: 'https://picsum.photos/seed/reading1/600/400', featured: true, url: '' },
    { id: 'r2', title: '5 Habits of Successful Learners', meta: 'Article • 6 min read', image: 'https://picsum.photos/seed/read2/80/80', url: '' },
    { id: 'r3', title: 'The Missing Piece', meta: 'Story • 15 min', image: 'https://picsum.photos/seed/read3/80/80', url: '' },
    { id: 'r4', title: 'Pride and Prejudice', meta: 'Book • Chapter 1', image: 'https://picsum.photos/seed/read4/80/80', url: '' },
    { id: 'r5', title: 'Vocabulary Building Guide', meta: 'Guide • 10 min', image: 'https://picsum.photos/seed/read5/80/80', url: '' },
  ]));
  const [videoItems, setVideoItems] = useState(() => load('cms_videos', [
    { id: 'v1', title: 'Complete English Grammar Course', desc: 'Master grammar fundamentals in this comprehensive video series.', author: 'Dr. Sarah Mitchell', views: '2.4K views', duration: '22:15', image: 'https://picsum.photos/seed/vidmain/500/300', featured: true, url: '' },
    { id: 'v2', title: 'Business English Basics', author: 'Prof. James Wilson', duration: '15:30', image: 'https://picsum.photos/seed/vid1/160/100', url: '' },
    { id: 'v3', title: 'Pronunciation Tips', author: 'Ms. Emily Chen', duration: '12:45', image: 'https://picsum.photos/seed/vid2/160/100', url: '' },
    { id: 'v4', title: 'Writing Workshop', author: 'Prof. James Wilson', duration: '18:20', image: 'https://picsum.photos/seed/vid3/160/100', url: '' },
  ]));

  // Persist on change
  useEffect(() => { save('cms_schedules', schedules); }, [schedules]);
  useEffect(() => { save('cms_featured', featuredContent); }, [featuredContent]);
  useEffect(() => { save('cms_achievements', achievements); }, [achievements]);
  useEffect(() => { save('cms_lessons', quickLessons); }, [quickLessons]);
  useEffect(() => { save('cms_reading', readingItems); }, [readingItems]);
  useEffect(() => { save('cms_videos', videoItems); }, [videoItems]);

  return { schedules, setSchedules, featuredContent, setFeaturedContent, achievements, setAchievements, quickLessons, setQuickLessons, readingItems, setReadingItems, videoItems, setVideoItems };
}

// ============================================
// TOAST NOTIFICATION
// ============================================
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('admin-toast');
  if (el) {
    el.textContent = msg; el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }
}

// ============================================
// SHARED CONTENT EDITOR MODAL
// ============================================
function ContentEditorModal({ open, onClose, title, fields, data, onSave, onDelete, t }) {
  // Hooks MUST be called unconditionally (before any early returns)
  const [editData, setEditData] = useState(() => data ? { ...data } : {});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) { setEditData({ ...data }); } else { setEditData({}); } }, [data]);

  // Conditional render AFTER all hooks
  if (!open) return null;

  const handleChange = (key, val) => setEditData(prev => ({ ...prev, [key]: val }));

  const handleImageUpload = (key) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        showToast(t('imageTooLarge'));
      }
      const reader = new FileReader();
      reader.onload = () => handleChange(key, reader.result);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSave = () => {
    setSaving(true);
    onSave(editData);
    showToast(t('contentSaved'));
    setTimeout(() => { setSaving(false); onClose(); }, 150);
  };

  const handleDelete = () => {
    if (onDelete && data?.id) {
      onDelete(data.id);
      showToast(t('contentDeleted'));
      onClose();
    }
  };

  // Close only when clicking the dark overlay background (not the modal itself)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="admin-modal-overlay" onClick={handleOverlayClick}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button className="admin-modal-close" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="admin-modal-body">
          {fields.map(f => {
            const cls = `admin-field${f.type === 'textarea' ? ' admin-field-textarea' : ''}${f.type === 'image' ? ' admin-field-image' : ''}`;
            return (
              <div key={f.key} className={cls}>
                <label>
                  {f.label}
                  {f.help && <span className="admin-field-help">{f.help}</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea rows={f.rows || 3} value={editData[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder || ''} />
                ) : f.type === 'select' ? (
                  <select value={editData[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)}>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'image' ? (
                  <div className="admin-image-field">
                    {editData[f.key] && <img src={editData[f.key]} alt="preview" className="admin-img-preview" />}
                    <div className="admin-image-actions">
                      <button type="button" className="btn-admin-upload" onClick={() => handleImageUpload(f.key)}>
                        <Icons.Upload /> {editData[f.key] ? t('changeImage') : t('uploadImage')}
                      </button>
                      <span className="admin-image-hint">{t('imageHint')}</span>
                    </div>
                    {editData[f.key] && <button type="button" className="btn-admin-remove" onClick={() => handleChange(f.key, '')}>{t('removeImage')}</button>}
                    <input
                      type="text"
                      style={{ marginTop: 6 }}
                      value={editData[f.key] || ''}
                      onChange={e => handleChange(f.key, e.target.value)}
                      placeholder={t('imagePlaceholder')}
                    />
                  </div>
                ) : f.type === 'url' ? (
                  <input type="url" value={editData[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder || 'https://...'} />
                ) : f.type === 'number' ? (
                  <input type="number" value={editData[f.key] ?? ''} onChange={e => handleChange(f.key, Number(e.target.value))} placeholder={f.placeholder || ''} />
                ) : (
                  <input type="text" value={editData[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder || ''} />
                )}
              </div>
            );
          })}
        </div>
        <div className="admin-modal-footer">
          {onDelete && data?.id ? (
            <button className="btn-admin-delete" onClick={handleDelete}><Icons.Trash /> {t('delete')}</button>
          ) : (
            <div />
          )}
          <div className="admin-modal-actions">
            <button className="btn-admin-cancel" onClick={onClose}>{t('cancel')}</button>
            <button className="btn-admin-save" onClick={handleSave} disabled={saving}>
              <Icons.Save /> {saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================
function DashboardPage({ user, setCurrentPage }) {
  const { t } = useTranslation();
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';
  const [activeTab, setActiveTab] = useState('all');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [installGuide, setInstallGuide] = useState(null); // 'android' | 'ios' | 'desktop' | null
  const [videoTab, setVideoTab] = useState('teaching'); // 'teaching' | 'songs'

  // Listen for install guide event from pwa-install fallback
  useEffect(() => {
    const handler = () => {
      // Determine platform from user agent
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/.test(ua)) setInstallGuide('ios');
      else if (/Android/.test(ua)) setInstallGuide('android');
      else setInstallGuide('desktop');
    };
    window.addEventListener('show-generic-install-guide', handler);
    return () => window.removeEventListener('show-generic-install-guide', handler);
  }, []);

  // Content Manager - loads from localStorage, falls back to hardcoded defaults
  const cm = useContentManager();

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchedules = cm.schedules.filter(s => s.date === todayStr);

  const filteredContent = activeTab === 'all'
    ? cm.featuredContent
    : cm.featuredContent.filter(c => c.type === activeTab);

  // --- Editor Modal States ---
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorConfig, setEditorConfig] = useState({ title: '', fields: [], data: null, onSave: null, onDelete: null });

  // Helper to open an editor
  const openEditor = ({ title, fields, data, onSave, onDelete }) => {
    setEditorConfig({ title, fields, data, onSave, onDelete });
    setEditorOpen(true);
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'article': return '📄';
      case 'video': return '🎬';
      case 'story': return '📖';
      case 'book': return '📚';
      default: return '📌';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'article': return '#10b981';
      case 'video': return '#ef4444';
      case 'story': return '#8b5cf6';
      case 'book': return '#f59e0b';
      default: return '#64748b';
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    localStorage.removeItem('cms_schedules');
    localStorage.removeItem('cms_featured');
    localStorage.removeItem('cms_achievements');
    localStorage.removeItem('cms_lessons');
    localStorage.removeItem('cms_reading');
    localStorage.removeItem('cms_videos');
    window.location.reload();
  };

  return (
    <div className="dashboard">
      {/* Toast notification */}
      <div id="admin-toast" className="admin-toast"></div>

      {/* Role indicator (visible for all users) */}
      <div className="role-indicator">
        <span className="role-badge">{t('role' + (user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)))}</span>
        {isAdmin && (
          <button className="btn-dash-reset" onClick={() => { if (window.confirm(t('resetConfirm'))) resetToDefaults(); }}>
            <Icons.Clear /> {t('resetDefaults')}
          </button>
        )}
      </div>

      {/* Hero Section — Welcome for guests, Dashboard for logged-in users */}
      {!user ? (
        <div className="dashboard-hero dashboard-hero-login">
          <div className="hero-slideshow">
            <div className="hero-slide-img"></div>
            <div className="hero-slide-img"></div>
            <div className="hero-slide-img"></div>
            <div className="hero-slide-img"></div>
          </div>
          <div className="hero-content-wrapper">
            <div className="hero-text">
              <div className="greeting-badge">{t('welcomeBack') || 'Welcome'}</div>
              <h1>Welcome to the Classroom</h1>
              <p className="hero-subtitle">Study languages <strong>online</strong> or <strong>in person</strong> — your learning journey begins here.</p>
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <span className="stat-number">50+</span>
                  <span className="stat-label">Courses</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👩‍🏫</div>
                <div className="stat-info">
                  <span className="stat-number">20+</span>
                  <span className="stat-label">Teachers</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🌍</div>
                <div className="stat-info">
                  <span className="stat-number">1000+</span>
                  <span className="stat-label">Students</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-hero">
          <div className="hero-slideshow">
            <div className="hero-slide-img"></div>
            <div className="hero-slide-img"></div>
            <div className="hero-slide-img"></div>
            <div className="hero-slide-img"></div>
          </div>
          <div className="hero-content-wrapper">
            <div className="hero-text">
              <div className="greeting-badge">{t('welcomeBack')}</div>
              <h1>{t('helloUser')} {user?.name || t('student')}!</h1>
              <p className="hero-subtitle">{t('dashboardSubtitle')} You have <strong>{todaySchedules.length} classes</strong> scheduled and <strong>3 new articles</strong> to explore.</p>
              <div className="hero-actions">
                <button className="btn-hero-primary" onClick={() => setCurrentPage?.('video')}>
                  <Icons.Video /> {t('joinLiveClass')}
                </button>
                <button className="btn-hero-secondary">
                  <Icons.Play /> {t('watchTutorial')}
                </button>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <span className="stat-number">12</span>
                  <span className="stat-label">{t('classesCompleted')}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <span className="stat-number">24{t('hoursAbbr')}</span>
                  <span className="stat-label">{t('learningTime')}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-info">
                  <span className="stat-number">3</span>
                  <span className="stat-label">{t('achievements')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Videos — Bilibili links for all visitors */}
      <section className="learning-videos-section">
        <div className="section-header-row">
          <h2><span>🎬</span> Learn English with Videos</h2>
          <div className="video-tab-btns">
            <button
              className={`video-tab-btn ${videoTab === 'teaching' ? 'active' : ''}`}
              onClick={() => setVideoTab('teaching')}
            >📚 Teaching</button>
            <button
              className={`video-tab-btn ${videoTab === 'songs' ? 'active' : ''}`}
              onClick={() => setVideoTab('songs')}
            >🎵 Songs</button>
          </div>
        </div>
        {videoTab === 'teaching' ? (
          <div className="video-grid">
            <a className="bili-video-card" href="https://www.bilibili.com/video/BV1Eh4y1m7XV?p=25" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-pu1">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">📚</span>
                  <span className="cover-label">Power Up 1–3</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">Power Up 1–3 · 自学素材</span>
                <span className="bili-card-meta">A妈有资源 · Lesson 25 | bilibili</span>
              </div>
            </a>
            <a className="bili-video-card" href="https://b23.tv/ep2034926" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-yakka">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">🍌</span>
                  <span className="cover-label">Yakka Dee · Banana</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">Yakka Dee 开口说英语 · EP1 Banana</span>
                <span className="bili-card-meta">儿童英语启蒙 · 第一季 | bilibili</span>
              </div>
            </a>
            <a className="bili-video-card" href="https://b23.tv/XOJoAnM" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-phonics">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">🔤</span>
                  <span className="cover-label">Oxford Phonics L1</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">牛津自然拼读 Level 1 · 字母表</span>
                <span className="bili-card-meta">幼儿英语自然拼读 · 全40集 | bilibili</span>
              </div>
            </a>
            <a className="bili-video-card" href="https://www.bilibili.com/video/BV19sdaBDE1w?p=26" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-puaj">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">📖</span>
                  <span className="cover-label">Power Up 1 · Unit AJ</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">Power Up 1 · Unit AJ Part 4</span>
                <span className="bili-card-meta">Cambridge English · Lesson 26 | bilibili</span>
              </div>
            </a>
          </div>
        ) : (
          <div className="video-grid">
            <a className="bili-video-card" href="https://b23.tv/t5yA3Td" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-head">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">🧒</span>
                  <span className="cover-label">Head, Shoulders, Knees &amp; Toes</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">Head, Shoulders, Knees &amp; Toes</span>
                <span className="bili-card-meta">Body parts song · 幼儿园英语 | bilibili</span>
              </div>
            </a>
            <a className="bili-video-card" href="https://b23.tv/JkCNJVv" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-hello">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">👋</span>
                  <span className="cover-label">Hello, Hello, How Are You?</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">Hello, Hello, How Are You?</span>
                <span className="bili-card-meta">SSS greeting song · English启蒙 | bilibili</span>
              </div>
            </a>
            <a className="bili-video-card" href="https://b23.tv/hVNPOjs" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-rain2">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">☔</span>
                  <span className="cover-label">Rain, Rain, Go Away</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">Rain, Rain, Go Away</span>
                <span className="bili-card-meta">一枚桃子老师 · SSS儿歌 | bilibili</span>
              </div>
            </a>
            <a className="bili-video-card" href="https://b23.tv/ImvmhZA" target="_blank" rel="noopener noreferrer">
              <div className="bili-thumb bili-cover-bus">
                <div className="bili-thumb-cover">
                  <span className="cover-emoji">🚌</span>
                  <span className="cover-label">The Wheels on the Bus</span>
                </div>
                <span className="bili-play-icon">▶</span>
              </div>
              <div className="bili-card-info">
                <span className="bili-card-title">The Wheels on the Bus</span>
                <span className="bili-card-meta">SSS classic · 二胖问天 | bilibili</span>
              </div>
            </a>
          </div>
        )}
      </section>

      {/* Subjects */}
      <section className="subjects-section">
        <div className="section-header-row">
          <h2><span>📖</span> {t('mySubjects')}</h2>
        </div>
        <div className="subjects-grid">
          {MAIN_SUBJECTS.map(subject => (
            <div key={subject.id} className="subject-card" style={{ '--subject-color': subject.color }}>
              <div className="subject-icon-bg">
                <span className="subject-icon">{subject.icon}</span>
              </div>
              <div className="subject-info">
                <h3>{t(subject.id)}</h3>
                <p>{t(subject.id + 'Desc')}</p>
              </div>
              <button className="subject-btn">{t('explore')}</button>
            </div>
          ))}
        </div>
      </section>

      {/* Today's Schedule - Compact Bar */}
      <div className="schedule-bar">
        <div className="schedule-bar-header">
          <h3><Icons.Clock /> {t('todaysClasses')}</h3>
          {isAdmin && (
            <button className="btn-admin-section-edit" onClick={() => openEditor({
              title: 'Add Class',
              fields: [
                { key: 'title', label: 'Class Title', placeholder: 'e.g. Advanced English Grammar' },
                { key: 'subject', label: 'Subject', placeholder: 'e.g. English, Math' },
                { key: 'teacher', label: 'Teacher', placeholder: "Dr. Sarah Mitchell" },
                { key: 'time', label: 'Time', placeholder: 'e.g. 09:00' },
                { key: 'type', label: 'Type', type: 'select', options: ['live', 'recorded'] },
                { key: 'date', label: 'Date (YYYY-MM-DD)', placeholder: todayStr },
              ],
              data: null,
              onSave: (d) => cm.setSchedules(prev => [...prev, { ...d, id: Date.now(), date: d.date || todayStr }]),
            })}><Icons.Plus /> Add Class</button>
          )}
          <span className="schedule-count">{todaySchedules.length} {t('sessions')}</span>
        </div>
        <div className="schedule-scroll">
          {todaySchedules.map(cls => (
            <div key={cls.id} className="schedule-card">
              <div className="schedule-time">{cls.time}</div>
              <div className="schedule-info">
                <h4>{cls.title}</h4>
                <p>{cls.teacher}</p>
              </div>
              <span className={`schedule-badge ${cls.type}`}>
                {cls.type === 'live' ? t('live') : t('recorded')}
              </span>
              <button className="btn-join" onClick={() => setCurrentPage('video')}>
                {cls.type === 'live' ? t('join') : t('watch')}
              </button>
              {isAdmin && (
                <button className="admin-list-edit" style={{ marginLeft: 6 }} onClick={() => openEditor({
                  title: 'Edit Class',
                  fields: [
                    { key: 'title', label: 'Title' }, { key: 'subject', label: 'Subject' },
                    { key: 'teacher', label: 'Teacher' }, { key: 'time', label: 'Time' },
                    { key: 'type', label: 'Type', type: 'select', options: ['live','recorded'] },
                    { key: 'date', label: 'Date' },
                  ],
                  data: cls,
                  onSave: (d) => cm.setSchedules(prev => prev.map(s => s.id === cls.id ? { ...s, ...d } : s)),
                  onDelete: (id) => cm.setSchedules(prev => prev.filter(s => s.id !== id)),
                })}><Icons.Edit /></button>
              )}
            </div>
          ))}
          {todaySchedules.length === 0 && (
            <div className="schedule-empty">No classes scheduled for today</div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <section className="progress-section">
        <div className="section-header-row">
          <h2><span>📊</span> {t('yourProgress')}</h2>
          {isAdmin && (
            <button className="btn-admin-section-edit" onClick={() => openEditor({
              title: 'Add Lesson',
              fields: [
                { key: 'title', label: 'Title', placeholder: 'e.g. Present Perfect Tense' },
                { key: 'icon', label: 'Icon (emoji)', placeholder: '📝' },
                { key: 'progress', label: 'Progress %', type: 'number', placeholder: '0-100' },
                { key: 'lessons', label: 'Total Lessons', type: 'number', placeholder: 'e.g. 12' },
                { key: 'completed', label: 'Completed', type: 'number', placeholder: 'e.g. 9' },
              ],
              data: null,
              onSave: (d) => cm.setQuickLessons(prev => [...prev, { ...d, id: Date.now() }]),
            })}><Icons.Plus /> Add Lesson</button>
          )}
        </div>
        <div className="progress-grid">
          {cm.quickLessons.map(lesson => (
            <div key={lesson.id} className="progress-card">
              <div className="progress-icon">{lesson.icon}</div>
              <div className="progress-info">
                <h4>{lesson.title}</h4>
                <p>{lesson.completed}/{lesson.lessons} {t('lessons')}</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${lesson.progress}%` }}></div>
                </div>
              </div>
              <span className="progress-percent">{lesson.progress}%</span>
              {isAdmin && (
                <button className="admin-card-edit admin-list-edit" onClick={() => openEditor({
                  title: 'Edit Lesson',
                  fields: [
                    { key: 'title', label: 'Title' }, { key: 'icon', label: 'Icon (emoji)' },
                    { key: 'progress', label: 'Progress %', type: 'number' },
                    { key: 'lessons', label: 'Total Lessons', type: 'number' },
                    { key: 'completed', label: 'Completed', type: 'number' },
                  ],
                  data: lesson,
                  onSave: (d) => cm.setQuickLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, ...d } : l)),
                  onDelete: (id) => cm.setQuickLessons(prev => prev.filter(l => l.id !== id)),
                })}><Icons.Edit /></button>
              )}
            </div>
          ))}
          {cm.quickLessons.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color:'#64748b', padding:'2rem' }}>No lessons yet</div>
          )}
        </div>
      </section>

      {/* Achievements Section */}
      <section className="achievements-section">
        <div className="section-header-row">
          <h2><span>🏅</span> {t('achievementsSection')}</h2>
          {isAdmin && (
            <button className="btn-admin-section-edit" onClick={() => openEditor({
              title: 'Add Achievement',
              fields: [
                { key: 'title', label: 'Title', placeholder: 'e.g. First Steps' },
                { key: 'description', label: 'Description', placeholder: 'e.g. Complete your first class' },
                { key: 'icon', label: 'Icon (emoji)', placeholder: '🎯' },
                { key: 'unlocked', label: 'Unlocked?', type: 'select', options: ['true', 'false'] },
              ],
              data: null,
              onSave: (d) => cm.setAchievements(prev => [...prev, { ...d, id: Date.now(), unlocked: d.unlocked === 'true' }]),
            })}><Icons.Plus /> Add</button>
          )}
        </div>
        <div className="achievements-scroll">
          {cm.achievements.map(ach => (
            <div key={ach.id} className={`achievement-badge ${ach.unlocked ? 'unlocked' : 'locked'}`}>
              <div className="achievement-icon">{ach.icon}</div>
              <span className="achievement-title">{ach.title}</span>
              <span className="achievement-desc">{ach.description}</span>
              {isAdmin && (
                <div className="admin-card-actions">
                  <button className="admin-card-edit" onClick={() => openEditor({
                    title: 'Edit Achievement',
                    fields: [
                      { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' },
                      { key: 'icon', label: 'Icon (emoji)' },
                      { key: 'unlocked', label: 'Unlocked?', type: 'select', options: ['true', 'false'] },
                    ],
                    data: ach,
                    onSave: (d) => cm.setAchievements(prev => prev.map(a => a.id === ach.id ? { ...a, ...d, unlocked: d.unlocked === 'true' } : a)),
                    onDelete: (id) => cm.setAchievements(prev => prev.filter(a => a.id !== id)),
                  })}><Icons.Edit /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Content Section */}
      <section className="content-section">
        <div className="section-header">
          <h2><span>📚</span> {t('featuredContent')}</h2>
          {isAdmin && (
            <button className="btn-admin-section-edit" onClick={() => openEditor({
              title: '添加精选内容',
              fields: [
                { key: 'title', label: '标题', placeholder: '文章标题' },
                { key: 'excerpt', label: '摘要/描述', type: 'textarea', rows: 3, placeholder: '简短描述...' },
                { key: 'type', label: '类型', type: 'select', options: ['article', 'video', 'story', 'book'] },
                { key: 'category', label: '分类', placeholder: 'e.g. Grammar, Business...' },
                { key: 'author', label: '作者', placeholder: '作者名' },
                { key: 'readTime', label: '阅读时间/时长', placeholder: 'e.g. 8 min read or 15:30' },
                { key: 'image', label: '封面图片', type: 'image', help: 'JPG/PNG/WebP ≤500KB，或粘贴URL' },
                { key: 'url', label: '链接地址', type: 'url', help: '视频→YouTube | 文章→网页 | PDF→GoogleDrive', placeholder: 'https://... 访问者可点击打开' },
              ],
              data: null,
              onSave: (d) => cm.setFeaturedContent(prev => [...prev, { ...d, id: Date.now(), date: new Date().toISOString().split('T')[0] }]),
            })}><Icons.Plus /> 添加内容</button>
          )}
          <div className="content-tabs">
            <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>{t('all')}</button>
            <button className={`tab ${activeTab === 'article' ? 'active' : ''}`} onClick={() => setActiveTab('article')}>📄 {t('article')}s</button>
            <button className={`tab ${activeTab === 'video' ? 'active' : ''}`} onClick={() => setActiveTab('video')}>🎬 {t('video')}s</button>
            <button className={`tab ${activeTab === 'story' ? 'active' : ''}`} onClick={() => setActiveTab('story')}>📖 {t('story')}s</button>
            <button className={`tab ${activeTab === 'book' ? 'active' : ''}`} onClick={() => setActiveTab('book')}>📚 {t('book')}s</button>
          </div>
        </div>
        <div className="content-grid">
          {filteredContent.map(content => (
            <div
              key={content.id}
              className={`content-card ${content.type}`}
              style={{ cursor: content.url ? 'pointer' : 'default' }}
              onClick={() => content.url ? window.open(content.url, '_blank') : null}
            >
              <div className="card-image">
                <img src={content.image || 'https://picsum.photos/seed/content/400/250'} alt={content.title} />
                <div className="card-overlay">
                  <span className="type-badge" style={{ backgroundColor: getTypeColor(content.type) }}>
                    {getTypeIcon(content.type)} {t(content.type)}
                  </span>
                  <button className="play-btn" onClick={(e) => { e.stopPropagation(); content.url ? window.open(content.url, '_blank') : showToast(t('noContentLink')); }}>
                    {content.type === 'video' ? <Icons.Play /> : <Icons.Book />}
                  </button>
                </div>
              </div>
              <div className="card-body">
                <span className="card-category">{content.category}</span>
                <h3 className="card-title">{content.title}</h3>
                <p className="card-excerpt">{content.excerpt}</p>
                <div className="card-footer">
                  <div className="card-author">
                    <Icons.User /> {content.author}
                  </div>
                  <span className="card-meta">
                    {content.readTime || content.duration}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div className="admin-card-actions-overlay" style={{ position:'absolute', top:8, right:8, zIndex:10, opacity: 1 }}>
                  <button className="admin-card-edit" onClick={(e) => { e.stopPropagation(); openEditor({
                    title: '编辑内容',
                    fields: [
                      { key: 'title', label: '标题' }, { key: 'excerpt', label: '摘要', type: 'textarea', rows: 3 },
                      { key: 'type', label: '类型', type: 'select', options: ['article', 'video', 'story', 'book'] },
                      { key: 'category', label: '分类' }, { key: 'author', label: '作者' },
                      { key: 'readTime', label: '阅读时间' }, { key: 'image', label: '图片', type: 'image', help: 'JPG/PNG/WebP ≤500KB 或URL' },
                      { key: 'url', label: '链接', type: 'url', help: '视频→YouTube | 文章→网页 | PDF→Drive', placeholder: 'https://...' },
                    ],
                    data: content,
                    onSave: (d) => cm.setFeaturedContent(prev => prev.map(c => c.id === content.id ? { ...c, ...d } : c)),
                    onDelete: (id) => cm.setFeaturedContent(prev => prev.filter(c => c.id !== id)),
                  }); }}><Icons.Edit /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Reading Corner - Stories & Articles */}
      <section className="reading-section">
        <div className="reading-header">
          <h2><span>📖</span> {t('readingCorner')}</h2>
          <p className="reading-subtitle">Expand your mind with these curated pieces</p>
          {isAdmin && (
            <button className="btn-admin-section-edit" onClick={() => openEditor({
              title: '添加阅读内容',
              fields: [
                { key: 'title', label: '标题', placeholder: '文章或书籍标题' },
                { key: 'desc', label: '描述（精选卡片用）', type: 'textarea', rows: 2, placeholder: '精选项目的简短描述' },
                { key: 'meta', label: '元信息', placeholder: 'e.g. Article • 6 min read' },
                { key: 'image', label: '封面图片', type: 'image', help: 'JPG/PNG/WebP ≤500KB 或URL' },
                { key: 'url', label: '链接地址', type: 'url', help: 'PDF/DOCX→GoogleDrive | 网页→URL', placeholder: 'https://... 访问者可点击打开' },
                { key: 'featured', label: '精选展示？', type: 'select', options: ['true', 'false'] },
              ],
              data: null,
              onSave: (d) => cm.setReadingItems(prev => [...prev, { ...d, id: 'r' + Date.now(), featured: d.featured === 'true' }]),
            })}><Icons.Plus /> 添加阅读</button>
          )}
        </div>
        <div className="reading-grid">
          {cm.readingItems.filter(r => r.featured).map(rItem => (
            <div key={rItem.id} className="reading-featured" style={{ position: 'relative' }}>
              <img src={rItem.image || 'https://picsum.photos/seed/reading1/600/400'} alt={rItem.title} />
              <div className="reading-overlay">
                <span className="featured-badge">✨ Featured</span>
                <h3>{rItem.title}</h3>
                <p>{rItem.desc}</p>
                <button className="btn-read-more" onClick={() => rItem.url ? window.open(rItem.url, '_blank') : showToast('该内容暂无链接')}>{t('startReading')}</button>
              </div>
              {isAdmin && (
                <div className="admin-card-actions-overlay" style={{ position:'absolute', top:8, right:8, zIndex:5, opacity: 1 }}>
                  <button className="admin-card-edit" onClick={() => openEditor({
                    title: '编辑阅读内容',
                    fields: [
                      { key: 'title', label: '标题' }, { key: 'desc', label: '描述', type: 'textarea', rows: 2 },
                      { key: 'meta', label: '元信息' }, { key: 'image', label: '图片', type: 'image', help: 'JPG/PNG/WebP ≤500KB 或URL' },
                      { key: 'url', label: '链接地址', type: 'url', help: 'PDF/DOCX→GoogleDrive | 网页→URL', placeholder: 'https://...' },
                      { key: 'featured', label: '精选？', type: 'select', options: ['true','false'] },
                    ],
                    data: rItem,
                    onSave: (d) => cm.setReadingItems(prev => prev.map(r => r.id === rItem.id ? { ...r, ...d, featured: d.featured === 'true' } : r)),
                    onDelete: (id) => cm.setReadingItems(prev => prev.filter(r => r.id !== id)),
                  })}><Icons.Edit /></button>
                </div>
              )}
            </div>
          ))}
          {cm.readingItems.filter(r => r.featured).length === 0 && (
            <div className="reading-featured">
              <img src="https://picsum.photos/seed/reading1/600/400" alt="Featured reading" />
              <div className="reading-overlay">
                <span className="featured-badge">✨ Featured</span>
                <h3>The Power of Reading</h3>
                <p>Discover how daily reading transforms your language skills and opens new worlds of knowledge.</p>
                <button className="btn-read-more">{t('startReading')}</button>
              </div>
            </div>
          )}
          <div className="reading-list">
            {cm.readingItems.filter(r => !r.featured).map(rItem => (
              <div key={rItem.id} className="reading-item" style={{ cursor: rItem.url ? 'pointer' : 'default' }} onClick={() => rItem.url && window.open(rItem.url, '_blank')}>
                <img src={rItem.image || 'https://picsum.photos/seed/read2/80/80'} alt="" />
                <div className="reading-item-info">
                  <h4>{rItem.title}</h4>
                  <p>{rItem.meta}</p>
                </div>
                {isAdmin && (
                  <button className="admin-card-edit admin-list-edit" onClick={(e) => { e.stopPropagation(); openEditor({
                    title: '编辑阅读',
                    fields: [
                      { key: 'title', label: '标题' }, { key: 'meta', label: '元信息' },
                      { key: 'url', label: '链接', type: 'url', help: '外部阅读链接 (PDF/网页)', placeholder: 'https://...' },
                      { key: 'image', label: '图片', type: 'image', help: 'JPG/PNG/WebP ≤500KB 或URL' },
                    ],
                    data: rItem,
                    onSave: (d) => cm.setReadingItems(prev => prev.map(r => r.id === rItem.id ? { ...r, ...d } : r)),
                    onDelete: (id) => cm.setReadingItems(prev => prev.filter(r => r.id !== id)),
                  }); }}><Icons.Trash /></button>
                )}
              </div>
            ))}
            {cm.readingItems.filter(r => !r.featured).length === 0 && (
              <>
                <div className="reading-item"><img src="https://picsum.photos/seed/read2/80/80" alt="" /><div className="reading-item-info"><h4>5 Habits of Successful Learners</h4><p>{t('article')} • 6 {t('minRead')}</p></div></div>
                <div className="reading-item"><img src="https://picsum.photos/seed/read3/80/80" alt="" /><div className="reading-item-info"><h4>The Missing Piece</h4><p>{t('story')} • 15 min</p></div></div>
                <div className="reading-item"><img src="https://picsum.photos/seed/read4/80/80" alt="" /><div className="reading-item-info"><h4>Pride and Prejudice</h4><p>{t('book')} • Chapter 1</p></div></div>
                <div className="reading-item"><img src="https://picsum.photos/seed/read5/80/80" alt="" /><div className="reading-item-info"><h4>Vocabulary Building Guide</h4><p>Guide • 10 min</p></div></div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Video Showcase */}
      <section className="video-showcase">
        <div className="showcase-header">
          <h2><span>🎬</span> {t('videoLibrary')}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isAdmin && (
              <button className="btn-admin-section-edit" onClick={() => openEditor({
                title: '添加视频',
                fields: [
                  { key: 'title', label: '视频标题', placeholder: '视频标题' },
                  { key: 'desc', label: '描述', type: 'textarea', rows: 2, placeholder: '这个视频关于什么？' },
                  { key: 'author', label: '讲师/作者', placeholder: '讲师姓名' },
                  { key: 'duration', label: '时长', placeholder: 'e.g. 22:15 or 1:30:00' },
                  { key: 'views', label: '观看信息', placeholder: 'e.g. 2.4K views' },
                  { key: 'image', label: '封面缩略图', type: 'image', help: 'JPG/PNG ≤500KB 或 URL' },
                  { key: 'url', label: '视频链接', type: 'url', help: '推荐 YouTube/Vimeo/B站 链接', placeholder: 'https://... 访问者可点击观看' },
                ],
                data: null,
                onSave: (d) => cm.setVideoItems(prev => [...prev, { ...d, id: 'v' + Date.now(), featured: false }]),
              })}><Icons.Plus /> 添加视频</button>
            )}
            <button className="view-all-btn" onClick={() => setCurrentPage('video')}>{t('viewAll')} {t('video')}s →</button>
          </div>
        </div>
        <div className="video-grid">
          {cm.videoItems.filter(v => v.featured).map(vItem => (
            <div key={vItem.id} className="video-featured-card" style={{ position: 'relative', cursor: vItem.url ? 'pointer' : 'default' }} onClick={() => vItem.url ? window.open(vItem.url, '_blank') : showToast(t('noVideoLink'))}>
              <div className="video-thumbnail">
                <img src={vItem.image || 'https://picsum.photos/seed/vidmain/500/300'} alt={vItem.title} />
                <div className="video-duration">{vItem.duration}</div>
                <div className="play-overlay"><div className="play-circle"><Icons.Play /></div></div>
              </div>
              <div className="video-info">
                <h3>{vItem.title}</h3>
                <p>{vItem.desc}</p>
                <div className="video-meta">
                  <span>👤 {vItem.author}</span>
                  <span>👁️ {vItem.views}</span>
                </div>
              </div>
              {isAdmin && (
                <div className="admin-card-actions-overlay" style={{ position:'absolute', top:8, right:8, zIndex:5, opacity: 1 }}>
                  <button className="admin-card-edit" onClick={(e) => { e.stopPropagation(); openEditor({
                    title: '编辑视频',
                    fields: [
                      { key: 'title', label: '标题' }, { key: 'desc', label: '描述', type: 'textarea', rows: 2 },
                      { key: 'author', label: '讲师' }, { key: 'duration', label: '时长' },
                      { key: 'views', label: '观看数' }, { key: 'image', label: '封面', type: 'image', help: 'JPG/PNG ≤500KB 或URL' },
                      { key: 'url', label: '视频链接', type: 'url', help: 'YouTube/Vimeo/B站', placeholder: 'https://...' },
                    ],
                    data: vItem,
                    onSave: (d) => cm.setVideoItems(prev => prev.map(v => v.id === vItem.id ? { ...v, ...d } : v)),
                    onDelete: (id) => cm.setVideoItems(prev => prev.filter(v => v.id !== id)),
                  }); }}><Icons.Edit /></button>
                </div>
              )}
            </div>
          ))}
          {cm.videoItems.filter(v => v.featured).length === 0 && (
            <div className="video-featured-card">
              <div className="video-thumbnail">
                <img src="https://picsum.photos/seed/vidmain/500/300" alt="Featured video" />
                <div className="video-duration">22:15</div>
                <div className="play-overlay"><div className="play-circle"><Icons.Play /></div></div>
              </div>
              <div className="video-info">
                <h3>Complete English Grammar Course</h3>
                <p>Master grammar fundamentals in this comprehensive video series.</p>
                <div className="video-meta"><span>👤 Dr. Sarah Mitchell</span><span>👁️ 2.4K views</span></div>
              </div>
            </div>
          )}
          <div className="video-list-small">
            {cm.videoItems.filter(v => !v.featured).map(vItem => (
              <div key={vItem.id} className="video-item" style={{ cursor: vItem.url ? 'pointer' : 'default' }} onClick={() => vItem.url ? window.open(vItem.url, '_blank') : null}>
                <div className="video-thumb">
                  <img src={vItem.image || 'https://picsum.photos/seed/vid1/160/100'} alt="" />
                  <span className="vid-duration">{vItem.duration}</span>
                </div>
                <div className="video-item-info">
                  <h4>{vItem.title}</h4>
                  <p>{vItem.author}</p>
                </div>
                {isAdmin && (
                  <button className="admin-list-edit" onClick={(e) => { e.stopPropagation(); openEditor({
                    title: '编辑视频',
                    fields: [
                      { key: 'title', label: '标题' }, { key: 'author', label: '讲师' },
                      { key: 'duration', label: '时长' }, { key: 'image', label: '图片', type: 'image', help: 'JPG/PNG ≤500KB 或URL' },
                      { key: 'url', label: '链接', type: 'url', help: 'YouTube/Vimeo/B站', placeholder: 'https://...' },
                    ],
                    data: vItem,
                    onSave: (d) => cm.setVideoItems(prev => prev.map(v => v.id === vItem.id ? { ...v, ...d } : v)),
                    onDelete: (id) => cm.setVideoItems(prev => prev.filter(v => v.id !== id)),
                  }); }}><Icons.Trash /></button>
                )}
              </div>
            ))}
            {cm.videoItems.filter(v => !v.featured).length === 0 && (
              <>
                <div className="video-item"><div className="video-thumb"><img src="https://picsum.photos/seed/vid1/160/100" alt="" /><span className="vid-duration">15:30</span></div><div className="video-item-info"><h4>Business English Basics</h4><p>Prof. James Wilson</p></div></div>
                <div className="video-item"><div className="video-thumb"><img src="https://picsum.photos/seed/vid2/160/100" alt="" /><span className="vid-duration">12:45</span></div><div className="video-item-info"><h4>Pronunciation Tips</h4><p>Ms. Emily Chen</p></div></div>
                <div className="video-item"><div className="video-thumb"><img src="https://picsum.photos/seed/vid3/160/100" alt="" /><span className="vid-duration">18:20</span></div><div className="video-item-info"><h4>Writing Workshop</h4><p>Prof. James Wilson</p></div></div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Dashboard Download Section — 3 platform-specific buttons */}
      <section className="dash-download-section">
        <div className="dash-download-inner">
          <div className="dash-download-text">
            <div className="dash-download-badge">{t('getTheApp')}</div>
            <h3>{t('dashboardDownloadTitle')}</h3>
            <p>{t('dashboardDownloadSubtitle')}</p>
          </div>
        </div>
        <div className="dash-download-platforms">
          {/* Android */}
          <button className="dash-dl-card android" onClick={() => {
            // Direct APK download link
            window.open('https://github.com/DeeAaaa/linguaclass/releases/latest', '_blank');
          }}>
            <span className="dash-dl-icon">🤖</span>
            <span className="dash-dl-name">{t('downloadAPK')}</span>
            <span className="dash-dl-hint">GitHub · APK</span>
          </button>
          {/* iOS */}
          <button className="dash-dl-card ios" onClick={() => setInstallGuide('ios')}>
            <span className="dash-dl-icon">🍎</span>
            <span className="dash-dl-name">{t('downloadForIOS')}</span>
            <span className="dash-dl-hint">Safari · Add to Home</span>
          </button>
          {/* Desktop */}
          <button className="dash-dl-card desktop" onClick={() => {
            const evt = new Event('trigger-pwa-install');
            window.dispatchEvent(evt);
            setTimeout(() => {
              if (!window.__deferredPromptFired) {
                setInstallGuide('desktop');
              }
            }, 500);
          }}>
            <span className="dash-dl-icon">💻</span>
            <span className="dash-dl-name">{t('downloadDesktopApp')}</span>
            <span className="dash-dl-hint">Chrome · Edge</span>
          </button>
        </div>
        {/* Install Guide Popup */}
        {installGuide && (
          <div className="dash-install-guide-overlay" onClick={() => setInstallGuide(null)}>
            <div className="dash-install-guide" onClick={e => e.stopPropagation()}>
              <button className="dash-guide-close" onClick={() => setInstallGuide(null)}>✕</button>
              {installGuide === 'ios' ? (
                <>
                  <div className="dash-guide-icon">🍎</div>
                  <h4>{t('installIOS')}</h4>
                  <p>{t('installIOSStep')}</p>
                  <div className="dash-guide-steps">
                    <div className="guide-step-row"><span>1</span> Tap <strong>Share</strong> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> in Safari</div>
                    <div className="guide-step-row"><span>2</span> Scroll and tap <strong>Add to Home Screen</strong></div>
                    <div className="guide-step-row"><span>3</span> Tap <strong>Add</strong> to install</div>
                  </div>
                </>
              ) : installGuide === 'android' ? (
                <>
                  <div className="dash-guide-icon">🤖</div>
                  <h4>{t('installAndroid')}</h4>
                  <p>{t('installAndroidStep')}</p>
                  <div className="dash-guide-steps">
                    <div className="guide-step-row"><span>1</span> Open in <strong>Chrome</strong> browser</div>
                    <div className="guide-step-row"><span>2</span> Tap <strong>⋮</strong> menu → <strong>Install app</strong></div>
                    <div className="guide-step-row"><span>3</span> Or <strong>download the APK</strong> from GitHub</div>
                  </div>
                  <a href="https://github.com/DeeAaaa/linguaclass/releases/latest" target="_blank" rel="noopener noreferrer" className="dash-guide-action" style={{textDecoration:'none'}}>
                    📱 {t('downloadAPKFromGithub')}
                  </a>
                </>
              ) : (
                <>
                  <div className="dash-guide-icon">💻</div>
                  <h4>{t('installDesktop')}</h4>
                  <p id="desktop-guide-status">{t('installDesktopStep')}</p>
                  <div className="dash-guide-steps">
                    <div className="guide-step-row"><span>1</span> Open in <strong>Chrome</strong> or <strong>Edge</strong></div>
                    <div className="guide-step-row"><span>2</span> Click <strong>Install</strong> icon in address bar ↓</div>
                    <div className="guide-step-row"><span>3</span> Or use <strong>⋮ → More tools → Create shortcut</strong></div>
                  </div>
                  <button className="dash-guide-action" onClick={async () => {
                    const btn = document.activeElement;
                    btn.textContent = '⏳ Trying...';
                    // Try PWA install
                    const evt = new Event('trigger-pwa-install');
                    window.dispatchEvent(evt);
                    // Wait and check result
                    await new Promise(r => setTimeout(r, 800));
                    if (!window.__deferredPromptFired) {
                      // PWA not available - show helpful fallback
                      const statusEl = document.getElementById('desktop-guide-status');
                      if (statusEl) {
                        statusEl.innerHTML = '<span style="color:#ef4444;font-weight:600;">⚠ Browser doesn\'t support one-click install</span><br><span style="font-size:0.82rem;color:#64748b">Look for the install icon ↑ in your address bar, or try Chrome/Edge.</span>';
                      }
                      btn.textContent = '🔍 Look at Address Bar ↑';
                      btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                    } else {
                      btn.textContent = '✓ Installing...';
                    }
                  }}>
                    📲 {t('installNow')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Editor Modal */}
      <ContentEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editorConfig.title}
        fields={editorConfig.fields}
        data={editorConfig.data}
        onSave={editorConfig.onSave}
        onDelete={editorConfig.onDelete}
        t={t}
      />
    </div>
  );
}

// ============================================
// CALENDAR PAGE
// ============================================

// Subject options
const SUBJECTS = [
  'English Grammar',
  'Business Writing',
  'Speaking Practice',
  'Reading Comprehension',
  'Vocabulary Building',
  'Pronunciation',
  'Academic Writing',
  'Literature',
  'Test Preparation',
  'Conversation Skills'
];

// Time options generator (00:00 to 23:00 in 30-minute increments)
const generateTimeOptions = () => {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

function CalendarPage({ user }) {
  const { t } = useTranslation();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentArchives, setStudentArchives] = useState(SAMPLE_STUDENT_ARCHIVES);
  const [registrationForm, setRegistrationForm] = useState({
    studentId: '',
    subject: '',
    startHour: '07', startMin: '25',
    endHour: '09', endMin: '05',
    activity: '',
    notes: ''
  });
  const canEdit = user?.role === 'admin' || user?.role === 'teacher';
  const isParent = user?.role === 'parent';

  // Get students based on role
  const getViewableStudents = () => {
    const all = getAllStudents();
    if (isParent) {
      return all.filter(s => s.parentId === user.parentId);
    }
    return all;
  };
  const viewableStudents = getViewableStudents();

  // Auto-select first student for parents
  useEffect(() => {
    if (isParent && viewableStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(viewableStudents[0]);
    }
  }, [isParent, viewableStudents, selectedStudent]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getDateStr = (day) => {
    if (!day) return '';
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getSchedulesForDate = (day) => {
    if (!day) return [];
    const dateStr = getDateStr(day);
    return SAMPLE_SCHEDULES.filter(s => s.date === dateStr);
  };

  const getArchivesForDate = (day) => {
    if (!day || !selectedStudent) return [];
    const dateStr = getDateStr(day);
    return studentArchives.filter(a => a.studentId === selectedStudent.id && a.date === dateStr);
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ANY date click opens the registration modal — only for admin/teacher
  const handleDateClick = (day) => {
    if (!day) return;
    // Parents and students can only VIEW, not register
    if (isParent) return; // parents view only
    if (!canEdit) return; // students view only
    setSelectedDate(day);
    // Pre-fill student if one is selected
    setRegistrationForm({
      studentId: selectedStudent?.id || '',
      subject: '',
      startHour: '07', startMin: '00',
      endHour: '08', endMin: '00',
      activity: '',
      notes: ''
    });
    setShowRegistrationModal(true);
  };

  const handleSaveRegistration = () => {
    if (!selectedDate || !registrationForm.studentId || !registrationForm.subject) return;

    const startTime = `${registrationForm.startHour}:${registrationForm.startMin}`;
    const endTime = `${registrationForm.endHour}:${registrationForm.endMin}`;
    const dateStr = getDateStr(selectedDate);
    const student = viewableStudents.find(s => s.id === parseInt(registrationForm.studentId));

    const newArchive = {
      id: Date.now(),
      studentId: parseInt(registrationForm.studentId),
      date: dateStr,
      timeSlot: startTime,
      subject: registrationForm.subject,
      startTime: startTime,
      endTime: endTime,
      activity: registrationForm.activity,
      notes: registrationForm.notes,
      teacher: user?.name || 'Self-registered'
    };
    
    setStudentArchives(prev => [...prev, newArchive]);
    setShowRegistrationModal(false);
    setSelectedDate(null);
    
    // Auto-select the student if not already
    if (!selectedStudent && student) {
      setSelectedStudent(student);
    }
  };

  const handleViewArchive = (archive) => {
    setSelectedDate(parseInt(archive.date.split('-')[2]));
    const [sh = '07', sm = '00'] = (archive.startTime || archive.timeSlot || '07:00').split(':');
    const [eh = '09', em = '00'] = (archive.endTime || '09:00').split(':');
    setRegistrationForm({
      studentId: archive.studentId || '',
      subject: archive.subject || '',
      startHour: sh, startMin: sm,
      endHour: eh, endMin: em,
      activity: archive.activity || '',
      notes: archive.notes || ''
    });
    setShowRegistrationModal(true);
  };

  return (
    <div className="calendar-page">
      <div className="calendar-container">
        {/* Student Selector Header */}
        <div className="student-selector-header">
          <div className="student-selector-info">
            <h3><Icons.Calendar /> Class Registration Calendar</h3>
            {(canEdit || isParent) && (
              <div className="student-dropdown-container">
                <label>Viewing Progress For:</label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const s = viewableStudents.find(s => s.id === parseInt(e.target.value));
                    setSelectedStudent(s);
                  }}
                  className="student-dropdown"
                >
                  <option value="">All Students</option>
                  {viewableStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.avatar} {student.name} ({student.grade})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {user?.role === 'student' && (
              <div className="current-student-badge">
                {selectedStudent?.avatar || user?.avatar} {selectedStudent?.name || user?.name}
              </div>
            )}
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-dot past"></span> Past</span>
            <span className="legend-item"><span className="legend-dot present"></span> Present</span>
            <span className="legend-item"><span className="legend-dot future"></span> Future</span>
          </div>
        </div>

        <div className="calendar-header">
          <button className="nav-btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
            <Icons.ChevronLeft />
          </button>
          <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <button className="nav-btn" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
            <Icons.ChevronRight />
          </button>
        </div>

        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="weekday">{t(`weekday${day}`)}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map((day, index) => {
            const schedules = getSchedulesForDate(day);
            const dateStr = getDateStr(day);
            // Show ALL archives for this date (across all students) so teachers see everything
            const allArchives = day ? studentArchives.filter(a => a.date === dateStr) : [];
            const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
            const totalBookings = allArchives.length + schedules.length;
            const hasBooking = totalBookings > 0;
            const weekdayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index % 7];
            return (
              <div
                key={index}
                className={`calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${selectedDate === day ? 'selected' : ''} ${hasBooking ? 'has-booking' : ''}`}
                onClick={() => day && handleDateClick(day)}
                title={day ? `${totalBookings} class${totalBookings !== 1 ? 'es' : ''} booked` : ''}
              >
                {day && (
                  <>
                    <span className="day-weekday">{t(`weekday${weekdayAbbr}`)}</span>
                    <span className="day-number">{day}</span>
                    {hasBooking && (
                      <div className="day-indicator">
                        {allArchives.slice(0, 3).map(a => {
                          const student = getAllStudents().find(s => s.id === a.studentId);
                          return (
                            <span key={a.id} className="booking-dot" title={student ? `${student.name}: ${a.subject}` : a.subject}></span>
                          );
                        })}
                        {schedules.slice(0, Math.max(0, 3 - allArchives.length)).map(s => (
                          <span key={s.id} className={`booking-dot ${s.type}`}></span>
                        ))}
                      </div>
                    )}
                    {totalBookings > 3 && (
                      <span className="booking-count">+{totalBookings - 3}</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Upcoming Registrations */}
      <div className="schedule-panel">
        <div className="panel-header">
          <h3>
            {selectedDate
              ? `${monthNames[currentDate.getMonth()]} ${selectedDate}, ${currentDate.getFullYear()}`
              : 'Upcoming Registrations'
            }
          </h3>
        </div>
        <div className="schedule-list">
          {selectedDate && selectedStudent ? (
            <>
              <div className="archive-summary">
                <h4><Icons.Users /> {selectedStudent.name}'s Sessions</h4>
                {(() => {
                  const archives = getArchivesForDate(selectedDate);
                  if (archives.length > 0) {
                    return (
                      <div className="time-slots-list">
                        {archives.map(archive => (
                          <div key={archive.id} className="time-slot-card" onClick={() => canEdit && handleViewArchive(archive)}>
                            <div className="time-slot-header">
                              <span className="time-slot-time">
                                <Icons.Clock /> {archive.startTime || archive.timeSlot}
                                {archive.endTime ? ` - ${archive.endTime}` : ''}
                              </span>
                            </div>
                            {archive.subject && <span className="time-slot-subject">{archive.subject}</span>}
                            <p className="time-slot-activity">{archive.activity}</p>
                            {archive.teacher && <span className="time-slot-teacher">by {archive.teacher}</span>}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return <p className="no-archive">No sessions on this day. Click on the date again to register!</p>;
                })()}
              </div>
            </>
          ) : (
            <>
              {/* Show all upcoming registrations across students */}
              <div className="archive-summary">
                <h4><Icons.Clock /> Recent Registrations</h4>
                {studentArchives.length > 0 ? (
                  <div className="time-slots-list">
                    {studentArchives.slice(-5).reverse().map(archive => {
                      const student = getAllStudents().find(s => s.id === archive.studentId);
                      return (
                        <div key={archive.id} className="time-slot-card" onClick={() => {
                          if (!canEdit) return;
                          setSelectedStudent(student);
                          handleViewArchive(archive);
                        }}>
                          <div className="time-slot-header">
                            <span className="time-slot-time">
                              <Icons.Clock /> {archive.date} {archive.startTime || archive.timeSlot}
                            </span>
                          </div>
                          {archive.subject && <span className="time-slot-subject">{archive.subject}</span>}
                          {student && <span className="time-slot-student">{student.avatar} {student.name}</span>}
                          <p className="time-slot-activity">{archive.activity}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-archive">No registrations yet. Click a date to get started!</p>
                )}
              </div>
            </>
          )}
          {canEdit && (
            <button className="btn-add-time-slot" onClick={() => {
              if (selectedDate) {
                handleDateClick(selectedDate);
              }
            }}>
              <Icons.Plus /> New Registration
            </button>
          )}
        </div>
      </div>

      {/* Registration Modal - Clean single step */}
      {showRegistrationModal && (
        <div className="modal-overlay" onClick={() => setShowRegistrationModal(false)}>
          <div className="registration-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Icons.Book /> Class Registration</h3>
              <div className="modal-student-info">
                {selectedDate ? `${monthNames[currentDate.getMonth()]} ${selectedDate}, ${currentDate.getFullYear()}` : ''}
              </div>
              <button className="modal-close" onClick={() => setShowRegistrationModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="reg-form">
                {/* Student Selection */}
                <div className="form-section">
                  <label>Student</label>
                  <select
                    value={registrationForm.studentId}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, studentId: e.target.value }))}
                    className="reg-select"
                  >
                    <option value="">Select a student...</option>
                    {viewableStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.avatar} {student.name} - {student.grade}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Display */}
                <div className="form-section time-section">
                  <div className="time-display">
                    <Icons.Calendar />
                    <span>{selectedDate ? `${monthNames[currentDate.getMonth()]} ${selectedDate}, ${currentDate.getFullYear()}` : ''}</span>
                  </div>
                </div>

                {/* Subject Selection */}
                <div className="form-section">
                  <label>Subject</label>
                  <select
                    value={registrationForm.subject}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="reg-select"
                  >
                    <option value="">Select a subject...</option>
                    {SUBJECTS.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>

                {/* Digital Time Picker - Hour + Minute */}
                <div className="form-section">
                  <label>Start Time</label>
                  <div className="digital-time-row">
                    <div className="digital-time-group">
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, startHour: String((parseInt(prev.startHour) + 23) % 24).padStart(2,'0') }))}>▲</button>
                      <input
                        type="text"
                        value={registrationForm.startHour}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g,'').slice(0,2);
                          const n = Math.min(23, Math.max(0, parseInt(v || '0')));
                          setRegistrationForm(prev => ({ ...prev, startHour: String(n).padStart(2,'0') }));
                        }}
                        className="digital-time-input"
                      />
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, startHour: String((parseInt(prev.startHour) + 1) % 24).padStart(2,'0') }))}>▼</button>
                    </div>
                    <span className="time-colon">:</span>
                    <div className="digital-time-group">
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, startMin: String((parseInt(prev.startMin) + 55) % 60).padStart(2,'0') }))}>▲</button>
                      <input
                        type="text"
                        value={registrationForm.startMin}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g,'').slice(0,2);
                          const n = Math.min(59, Math.max(0, parseInt(v || '0')));
                          setRegistrationForm(prev => ({ ...prev, startMin: String(n).padStart(2,'0') }));
                        }}
                        className="digital-time-input"
                      />
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, startMin: String((parseInt(prev.startMin) + 5) % 60).padStart(2,'0') }))}>▼</button>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <label>End Time</label>
                  <div className="digital-time-row">
                    <div className="digital-time-group">
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, endHour: String((parseInt(prev.endHour) + 23) % 24).padStart(2,'0') }))}>▲</button>
                      <input
                        type="text"
                        value={registrationForm.endHour}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g,'').slice(0,2);
                          const n = Math.min(23, Math.max(0, parseInt(v || '0')));
                          setRegistrationForm(prev => ({ ...prev, endHour: String(n).padStart(2,'0') }));
                        }}
                        className="digital-time-input"
                      />
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, endHour: String((parseInt(prev.endHour) + 1) % 24).padStart(2,'0') }))}>▼</button>
                    </div>
                    <span className="time-colon">:</span>
                    <div className="digital-time-group">
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, endMin: String((parseInt(prev.endMin) + 55) % 60).padStart(2,'0') }))}>▲</button>
                      <input
                        type="text"
                        value={registrationForm.endMin}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g,'').slice(0,2);
                          const n = Math.min(59, Math.max(0, parseInt(v || '0')));
                          setRegistrationForm(prev => ({ ...prev, endMin: String(n).padStart(2,'0') }));
                        }}
                        className="digital-time-input"
                      />
                      <button className="time-arrow" onClick={() => setRegistrationForm(prev => ({ ...prev, endMin: String((parseInt(prev.endMin) + 5) % 60).padStart(2,'0') }))}>▼</button>
                    </div>
                  </div>
                </div>

                {/* Activity */}
                <div className="form-section">
                  <label>What will you study/do?</label>
                  <textarea
                    placeholder="Describe the session, topics to cover, learning goals..."
                    value={registrationForm.activity}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, activity: e.target.value }))}
                    rows={3}
                    className="reg-textarea"
                  />
                </div>

                {/* Notes */}
                <div className="form-section">
                  <label>Notes (optional)</label>
                  <textarea
                    placeholder="Additional notes, homework, preparation needed..."
                    value={registrationForm.notes}
                    onChange={(e) => setRegistrationForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="reg-textarea"
                  />
                </div>

                {/* Teacher Info */}
                {canEdit && (
                  <div className="form-section teacher-info">
                    Registered by: <strong>{user?.name}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowRegistrationModal(false)}>Close</button>
              {canEdit && (
                <button className="btn-save" onClick={handleSaveRegistration}>
                  <Icons.Save /> Register Class
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STUDENT RECORDS PAGE
// ============================================
function StudentRecordsPage({ user }) {
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const canEdit = isAdmin || isTeacher;
  const isParent = user?.role === 'parent';

  // ALL students (samples + persisted) — always loaded fresh
  const getAll = () => getAllStudents();

  // For parents: find MY CHILDREN by matching email or parentId
  const getMyChildren = () => {
    if (!isParent) return [];
    const all = getAll();
    const email = (user?.email || '').toLowerCase();
    const pid = user?.parentId;
    // Match by parentId OR parentEmail
    const kids = all.filter(s => {
      if (pid && s.parentId === pid) return true;
      if (email && s.parentEmail && s.parentEmail.toLowerCase() === email) return true;
      return false;
    });
    return kids;
  };

  // Main records: for parents, show All Students so they can always browse & search
  const [records, setRecords] = useState(() => getAll());
  // Derived: my children that match this parent
  const myChildren = getMyChildren();
  const hasLinkedChildren = myChildren.length > 0;

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Persist records changes
  useEffect(() => {
    if (dataInitialized) {
      saveStoredStudents(records);
    }
  }, [records, dataInitialized]);

  // Auto-hide success message
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  useEffect(() => {
    setDataInitialized(true);
  }, []);

  const subjects = ['all', 'English', 'Mathematics', 'Science'];

  // Searchable pool: always ALL students for parents, records for others
  const searchPool = isParent ? getAll() : records;

  const filteredRecords = searchPool.filter(record => {
    const matchesStatus = filterStatus === 'all' || record.completionStatus === filterStatus;
    const matchesSubject = filterSubject === 'all' || record.subject === filterSubject;
    const q = activeSearchQuery.toLowerCase().trim();
    const matchesSearch = q === '' || (
      record.name.toLowerCase().includes(q) ||
      (record.parentName && record.parentName.toLowerCase().includes(q)) ||
      (record.parentEmail && record.parentEmail.toLowerCase().includes(q)) ||
      (record.teacher && record.teacher.toLowerCase().includes(q)) ||
      (record.grade && record.grade.toLowerCase().includes(q)) ||
      (record.subject && record.subject.toLowerCase().includes(q)) ||
      (record.scheduleDay && record.scheduleDay.toLowerCase().includes(q)) ||
      (record.scheduleTime && record.scheduleTime.toLowerCase().includes(q))
    );
    return matchesStatus && matchesSubject && matchesSearch;
  });

  // Stats: for parents, show My Children stats; for admin/teacher, show all
  const statsPool = isParent && hasLinkedChildren ? myChildren : records;
  const totalStudents = statsPool.length;
  const activeStudents = statsPool.filter(r => r.completionStatus === 'active').length;
  const completedStudents = statsPool.filter(r => r.completionStatus === 'completed').length;
  const pendingPayments = statsPool.filter(r => r.paymentStatus === 'pending').length;
  const totalRevenue = statsPool.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.paymentAmount, 0);

  const handleEditRecord = (record) => {
    setEditingRecord({ ...record });
    setShowEditModal(true);
  };

  const handleViewDetails = (record) => {
    setDetailRecord(record);
    setShowDetailModal(true);
  };

  const handleSaveEdit = () => {
    // Auto-assign parentId if parentEmail is provided
    let recordToSave = { ...editingRecord };
    if (recordToSave.parentEmail && !recordToSave.parentId) {
      // Check existing students to find matching parentId
      const allSaved = getAllStudents();
      const existing = allSaved.find(s =>
        s.parentEmail && s.parentEmail.toLowerCase() === recordToSave.parentEmail.toLowerCase()
      );
      if (existing && existing.parentId) {
        recordToSave.parentId = existing.parentId;
      } else {
        // Generate a new parentId from email hash
        let hash = 0;
        const email = recordToSave.parentEmail.toLowerCase();
        for (let i = 0; i < email.length; i++) {
          hash = ((hash << 5) - hash) + email.charCodeAt(i);
          hash |= 0;
        }
        recordToSave.parentId = Math.abs(hash) % 99999 + 100;
      }
    }

    // Ensure study period fields exist
    if (!recordToSave.enrolledDate) {
      recordToSave.enrolledDate = new Date().toISOString().split('T')[0];
    }

    let updatedRecords;
    if (editingRecord.isNew) {
      const newRecord = { ...recordToSave, id: Date.now(), isNew: undefined };
      updatedRecords = [...records, newRecord];
    } else {
      updatedRecords = records.map(r => r.id === editingRecord.id ? recordToSave : r);
    }

    // IMMEDIATE save to localStorage so parents can find newly registered students right away
    setRecords(updatedRecords);
    saveStoredStudents(updatedRecords);
    setShowEditModal(false);
    setEditingRecord(null);
    setSaveSuccess(true);

    // Also save the student's parent info to contacts for parent linking
    if (recordToSave.parentEmail) {
      try {
        const stored = JSON.parse(localStorage.getItem('linguaclass_student_parent_map') || '{}');
        stored[recordToSave.parentEmail.toLowerCase()] = {
          parentName: recordToSave.parentName,
          parentEmail: recordToSave.parentEmail,
          parentId: recordToSave.parentId,
          studentId: editingRecord.isNew ? Date.now() : editingRecord.id,
          studentName: recordToSave.name
        };
        localStorage.setItem('linguaclass_student_parent_map', JSON.stringify(stored));
      } catch (_) {}
    }
  };

  const handleAddStudent = () => {
    setEditingRecord({
      id: null,
      name: '',
      grade: 'Grade 5',
      subject: 'English',
      teacher: user?.name || '',
      totalHours: 30,
      usedHours: 0,
      daysAttended: 0,
      totalDays: 30,
      paymentStatus: 'pending',
      paymentAmount: 0,
      completionStatus: 'active',
      parentName: '',
      parentEmail: '',
      enrolledDate: new Date().toISOString().split('T')[0],
      parentId: null,
      avatar: '👤',
      scheduleDay: '',
      scheduleTime: '',
      isNew: true,
    });
    setShowEditModal(true);
  };

  const handleDeleteRecord = (id) => {
    if (window.confirm('Are you sure you want to delete this student record?')) {
      setRecords(records.filter(r => r.id !== id));
      setShowDetailModal(false);
    }
  };

  const getProgressPercent = (used, total) => Math.round((used / total) * 100);

  // Helper: render a single student card (reused for parent & admin/teacher views)
  const renderStudentCard = (record, isLinked = false) => (
    <div
      key={record.id}
      className={`record-card ${isLinked ? 'linked-child' : ''} ${record.paymentStatus === 'pending' ? 'payment-pending' : ''}`}
      onClick={() => setSelectedStudent(record)}
    >
      <div className="record-header">
        <div className="student-avatar">
          {record.avatar || record.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="student-basic">
          <h4>{record.name}</h4>
          <span className="grade-badge">{record.grade}</span>
          <span className={`subject-badge ${record.subject.toLowerCase()}`}>{record.subject}</span>
        </div>
        <span className={`status-badge ${record.completionStatus}`}>
          {record.completionStatus === 'completed' ? <Icons.Check /> : <Icons.Clock />}
          {record.completionStatus}
        </span>
      </div>
      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${getProgressPercent(record.usedHours, record.totalHours)}%` }}></div>
        </div>
        <div className="progress-details">
          <span><Icons.Clock /> {record.usedHours}h / {record.totalHours}h</span>
          <span><Icons.Calendar /> {record.daysAttended} / {record.totalDays} days</span>
        </div>
      </div>
      <div className="payment-section">
        <div className={`payment-status ${record.paymentStatus}`}>
          <Icons.Dollar />
          <div className="payment-info">
            <span className="payment-label">{record.paymentStatus === 'paid' ? 'Payment Complete' : 'Payment Pending'}</span>
            <span className="payment-amount">${record.paymentAmount}</span>
          </div>
        </div>
      </div>
      <div className="info-grid">
        <div className="info-item">
          <Icons.User /><span className="info-label">Teacher</span><span className="info-value">{record.teacher}</span>
        </div>
        <div className="info-item study-period">
          <Icons.Calendar /><span className="info-label">Study Period</span>
          <span className="info-value">
            {new Date(record.enrolledDate).toLocaleDateString()} — {record.completionStatus === 'completed' ? new Date(record.enrolledDate).toLocaleDateString(undefined, {year: 'numeric', month: 'short'}) : 'Ongoing'}
            {(() => {
              const start = new Date(record.enrolledDate);
              const now = new Date();
              const diffMs = now - start;
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const months = Math.floor(diffDays / 30);
              if (months < 1) return <span className="period-duration"> ({diffDays} days)</span>;
              if (months < 12) return <span className="period-duration"> ({months} month{months > 1 ? 's' : ''})</span>;
              const years = Math.floor(months / 12);
              return <span className="period-duration"> ({years} year{years > 1 ? 's' : ''}, {months % 12} month{(months % 12) !== 1 ? 's' : ''})</span>;
            })()}
          </span>
        </div>
        {(record.scheduleDay || record.scheduleTime) && (
          <div className="info-item schedule-info">
            <Icons.Clock /><span className="info-label">Class Schedule</span>
            <span className="info-value">
              {record.scheduleDay && <span className="schedule-day">{record.scheduleDay}</span>}
              {record.scheduleDay && record.scheduleTime && <span className="schedule-sep"> | </span>}
              {record.scheduleTime && <span className="schedule-time">{record.scheduleTime}</span>}
            </span>
          </div>
        )}
        <div className="info-item">
          <Icons.User /><span className="info-label">Parent</span><span className="info-value">{record.parentName}</span>
        </div>
      </div>
      {canEdit && (
        <div className="record-actions">
          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); handleEditRecord(record); }}>
            <Icons.Edit /> Edit
          </button>
          <button className="btn-view" onClick={(e) => { e.stopPropagation(); handleViewDetails(record); }}>
            <Icons.Eye /> View Details
          </button>
        </div>
      )}
      {isParent && (
        <div className="contact-section">
          <button className="btn-contact" onClick={(e) => e.stopPropagation()}><Icons.Mail /> Contact Teacher</button>
          <button className="btn-contact-alt" onClick={(e) => e.stopPropagation()}><Icons.PhoneCall /> Contact Admin</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="records-page">
      <div className="records-hero">
        <div className="records-hero-content">
          <h2>
            <Icons.StudentRecords /> Student Progress Records
          </h2>
          <p>Track student learning progress, payments, and completion status</p>
        </div>
        <div className="records-hero-decoration">
          <div className="hero-circle c1"></div>
          <div className="hero-circle c2"></div>
          <div className="hero-circle c3"></div>
        </div>
      </div>

      <div className="records-stats">
        <div className="stat-card total">
          <div className="stat-icon"><Icons.Users /></div>
          <div className="stat-info">
            <span className="stat-number">{totalStudents}</span>
            <span className="stat-label">{isParent && hasLinkedChildren ? 'My Children' : 'Total Students'}</span>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon"><Icons.Clock /></div>
          <div className="stat-info">
            <span className="stat-number">{activeStudents}</span>
            <span className="stat-label">Active Students</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon"><Icons.Check /></div>
          <div className="stat-info">
            <span className="stat-number">{completedStudents}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon"><Icons.Dollar /></div>
          <div className="stat-info">
            <span className="stat-number">{pendingPayments}</span>
            <span className="stat-label">Pending Payment</span>
          </div>
        </div>
        {isAdmin && (
          <div className="stat-card revenue">
            <div className="stat-icon"><Icons.Dollar /></div>
            <div className="stat-info">
              <span className="stat-number">${totalRevenue}</span>
              <span className="stat-label">Total Collected</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== SAVE SUCCESS NOTIFICATION ===== */}
      {saveSuccess && (
        <div className="save-success-banner">
          <span className="success-icon">✓</span>
          <span>Student record has been saved successfully. Parents can now find this student by searching.</span>
        </div>
      )}

      <div className="records-toolbar">
        <div className="toolbar-filters">
          <div className={`search-box ${isParent && activeSearchQuery.trim().length > 0 ? 'search-active' : ''}`}>
            <Icons.User />
            <input
              type="text"
              placeholder={isParent
                ? "Search student or parent name, email, teacher..."
                : "Search student or parent name..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setActiveSearchQuery(searchInput); }}
            />
            <button
              className="btn-search"
              onClick={() => setActiveSearchQuery(searchInput)}
              title="Click to search"
            >
              <Icons.Search /> Search
            </button>
            {activeSearchQuery.trim().length > 0 && (
              <button
                className="btn-search-clear"
                onClick={() => { setSearchInput(''); setActiveSearchQuery(''); }}
                title="Clear search"
              >
                <Icons.X />
              </button>
            )}
            {isParent && activeSearchQuery.trim().length > 0 && (
              <span className="search-scope-badge">Searching All Students</span>
            )}
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Subject:</label>
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
              {subjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
            </select>
          </div>
        </div>
        {canEdit && (
          <div className="toolbar-actions">
            <button className="btn-primary" onClick={handleAddStudent}>
              <Icons.Plus /> Add Student
            </button>
          </div>
        )}
      </div>

      {/* ===== PARENT VIEW: My Children (linked by email/parentId) ===== */}
      {isParent && hasLinkedChildren && (
        <div className="my-children-section">
          <div className="my-children-header">
            <Icons.People />
            <h3>My Children ({myChildren.length})</h3>
          </div>
          <p className="my-children-subtitle">These students are linked to your account</p>
          <div className="records-grid">
            {myChildren.map(record => renderStudentCard(record, true))}
          </div>
        </div>
      )}

      {/* ===== PARENT VIEW: No linked children — Find Your Child ===== */}
      {isParent && !hasLinkedChildren && activeSearchQuery.trim().length === 0 && (
        <div className="find-child-section">
          <div className="find-child-hero">
            <Icons.People />
            <h3>Find Your Child</h3>
            <p>Enter your child's name, your name, or your email address in the search box above and click <strong>Search</strong> to find their student record.</p>
            <p className="find-child-hint">
              <strong>Your email:</strong> {user?.email || 'Not set'}<br/>
              <strong>Your name:</strong> {user?.name || 'Not set'}
            </p>
            <div className="find-child-buttons">
              <button className="btn-primary" onClick={() => { setSearchInput(user?.name || ''); setActiveSearchQuery(user?.name || ''); }}>
                <Icons.Search /> Search by My Name
              </button>
              <button className="btn-secondary" onClick={() => { setSearchInput(user?.email || ''); setActiveSearchQuery(user?.email || ''); }}>
                <Icons.Search /> Search by My Email
              </button>
            </div>
          </div>
          <div className="demo-parent-section">
            <h4>Demo: Log in as a parent to see linked children</h4>
            <p>To test parent-child linking, log out and register/login as a parent using one of these emails:</p>
            <div className="demo-parent-list">
              {SAMPLE_STUDENTS.slice(0, 3).map(s => (
                <div key={s.id} className="demo-parent-card">
                  <span className="demo-avatar">{s.avatar}</span>
                  <div className="demo-info">
                    <strong>{s.name}</strong>
                    <span>Parent: {s.parentName}</span>
                    <code>Email: {s.parentEmail}</code>
                  </div>
                </div>
              ))}
            </div>
            <p className="demo-note">Register with one of the parent emails above to automatically see your child on this page.</p>
          </div>
        </div>
      )}

      {/* ===== SEARCH AREA: Always show search for parents ===== */}
      {isParent && activeSearchQuery.trim().length > 0 && (
        <div className="search-results-section">
          <h3>
            <Icons.Search /> Search Results for "<strong>{activeSearchQuery}</strong>"
            {filteredRecords.length > 0 && <span className="result-count">({filteredRecords.length} found)</span>}
          </h3>
          {filteredRecords.length > 0 && (
            <div className="records-grid">
              {filteredRecords.map(record => renderStudentCard(record))}
            </div>
          )}
          {filteredRecords.length === 0 && (
            <div className="empty-state">
              <Icons.Search />
              <h3>No Matching Students</h3>
              <p>No students match "<strong>{activeSearchQuery}</strong>". Try searching by:</p>
              <ul className="search-suggestions">
                <li>Student name (e.g., Emma Thompson)</li>
                <li>Parent name (e.g., Michael Thompson)</li>
                <li>Parent email (e.g., michael.t@email.com)</li>
                <li>Teacher name (e.g., Sarah Mitchell)</li>
                <li>Study day (e.g., Monday, Wednesday)</li>
                <li>Study time (e.g., Morning, Evening)</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ===== ADMIN / TEACHER View ===== */}
      {!isParent && (
        <>
          <div className="info-banner">
            <Icons.Shield />
            <div className="banner-content">
              <h4>Administrator or Teacher Access</h4>
              <p>Teachers and administrators can modify student records. Parents can view their children's progress and contact teachers or administrators for any questions.</p>
            </div>
          </div>
          <div className="records-grid">
            {filteredRecords.map(record => renderStudentCard(record))}
          </div>

          {filteredRecords.length === 0 && (
            <div className="empty-state">
              <Icons.StudentRecords />
              <h3>No Records Found</h3>
              <p>No students match your current filters.</p>
              {canEdit && (
                <button className="btn-primary" onClick={handleAddStudent}>
                  <Icons.Plus /> Add First Student
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== DETAIL MODAL ===== */}
      {selectedStudent && !showEditModal && !showDetailModal && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedStudent.name}</h3>
              <button className="modal-close" onClick={() => setSelectedStudent(null)}>×</button>
            </div>
            <div className="student-detail-content">
              <p><strong>Grade:</strong> {selectedStudent.grade}</p>
              <p><strong>Subject:</strong> {selectedStudent.subject}</p>
              <p><strong>Teacher:</strong> {selectedStudent.teacher}</p>
              <p><strong>Parent:</strong> {selectedStudent.parentName} ({selectedStudent.parentEmail})</p>
              <p><strong>Progress:</strong> {selectedStudent.usedHours}/{selectedStudent.totalHours}h ({Math.round((selectedStudent.usedHours/selectedStudent.totalHours)*100)}%)</p>
              <p><strong>Attendance:</strong> {selectedStudent.daysAttended}/{selectedStudent.totalDays} days</p>
              <p><strong>Payment:</strong> {selectedStudent.paymentStatus} (${selectedStudent.paymentAmount})</p>
              {selectedStudent.scheduleDay && <p><strong>Study Day:</strong> {selectedStudent.scheduleDay}</p>}
              {selectedStudent.scheduleTime && <p><strong>Study Time:</strong> {selectedStudent.scheduleTime}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {showEditModal && editingRecord && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Icons.Edit /> {editingRecord.isNew ? 'Add New Student' : 'Edit Student Record'}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Student Name</label>
                  <input
                    type="text"
                    value={editingRecord.name}
                    onChange={(e) => setEditingRecord({ ...editingRecord, name: e.target.value })}
                    placeholder="Enter student name"
                  />
                </div>
                <div className="form-group">
                  <label>Grade</label>
                  <input
                    type="text"
                    value={editingRecord.grade}
                    onChange={(e) => setEditingRecord({ ...editingRecord, grade: e.target.value })}
                    placeholder="e.g. Grade 5"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Subject</label>
                  <select
                    value={editingRecord.subject}
                    onChange={(e) => setEditingRecord({ ...editingRecord, subject: e.target.value })}
                  >
                    <option value="English">English</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Teacher</label>
                  <input
                    type="text"
                    value={editingRecord.teacher}
                    onChange={(e) => setEditingRecord({ ...editingRecord, teacher: e.target.value })}
                    placeholder="Assign teacher"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Hours Used</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.usedHours}
                    onChange={(e) => setEditingRecord({ ...editingRecord, usedHours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Total Hours</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRecord.totalHours}
                    onChange={(e) => setEditingRecord({ ...editingRecord, totalHours: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Days Attended</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.daysAttended}
                    onChange={(e) => setEditingRecord({ ...editingRecord, daysAttended: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Total Days</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRecord.totalDays}
                    onChange={(e) => setEditingRecord({ ...editingRecord, totalDays: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    value={editingRecord.paymentStatus}
                    onChange={(e) => setEditingRecord({ ...editingRecord, paymentStatus: e.target.value })}
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingRecord.paymentAmount}
                    onChange={(e) => setEditingRecord({ ...editingRecord, paymentAmount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Completion Status</label>
                  <select
                    value={editingRecord.completionStatus}
                    onChange={(e) => setEditingRecord({ ...editingRecord, completionStatus: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Enrolled Date</label>
                  <input
                    type="date"
                    value={editingRecord.enrolledDate}
                    onChange={(e) => setEditingRecord({ ...editingRecord, enrolledDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Study Day (day of month/week)</label>
                  <input
                    type="text"
                    value={editingRecord.scheduleDay || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, scheduleDay: e.target.value })}
                    placeholder="e.g. Monday, Wednesday, Friday"
                  />
                </div>
                <div className="form-group">
                  <label>Study Time (time of day)</label>
                  <select
                    value={editingRecord.scheduleTime || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, scheduleTime: e.target.value })}
                  >
                    <option value="">Select time slot</option>
                    <option value="Morning 7:00 - 9:00 AM">Morning 7:00 - 9:00 AM</option>
                    <option value="Morning 8:00 - 10:00 AM">Morning 8:00 - 10:00 AM</option>
                    <option value="Morning 9:00 - 11:00 AM">Morning 9:00 - 11:00 AM</option>
                    <option value="Morning 10:00 AM - 12:00 PM">Morning 10:00 AM - 12:00 PM</option>
                    <option value="Afternoon 1:00 - 3:00 PM">Afternoon 1:00 - 3:00 PM</option>
                    <option value="Afternoon 2:00 - 4:00 PM">Afternoon 2:00 - 4:00 PM</option>
                    <option value="Afternoon 3:00 - 5:00 PM">Afternoon 3:00 - 5:00 PM</option>
                    <option value="Afternoon 4:00 - 6:00 PM">Afternoon 4:00 - 6:00 PM</option>
                    <option value="Evening 6:00 - 8:00 PM">Evening 6:00 - 8:00 PM</option>
                    <option value="Evening 7:00 - 9:00 PM">Evening 7:00 - 9:00 PM</option>
                    <option value="Evening 8:00 - 10:00 PM">Evening 8:00 - 10:00 PM</option>
                  </select>
                </div>
              </div>
              <div className="form-group full">
                <label>Parent Name</label>
                <input
                  type="text"
                  value={editingRecord.parentName}
                  onChange={(e) => setEditingRecord({ ...editingRecord, parentName: e.target.value })}
                  placeholder="Enter parent name"
                />
              </div>
              <div className="form-group full">
                <label>Parent Email</label>
                <input
                  type="email"
                  value={editingRecord.parentEmail}
                  onChange={(e) => setEditingRecord({ ...editingRecord, parentEmail: e.target.value })}
                  placeholder="Enter parent email"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveEdit}>
                <Icons.Save /> {editingRecord.isNew ? 'Add Student' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailRecord && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Icons.Eye /> Student Details</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="student-avatar large">{detailRecord.name.split(' ').map(n => n[0]).join('')}</div>
                <div>
                  <h4>{detailRecord.name}</h4>
                  <span className="grade-badge">{detailRecord.grade}</span>
                  <span className={`subject-badge ${detailRecord.subject.toLowerCase()}`}>{detailRecord.subject}</span>
                  <span className={`status-badge ${detailRecord.completionStatus}`}>{detailRecord.completionStatus}</span>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-item"><strong>Teacher:</strong> {detailRecord.teacher}</div>
                <div className="detail-item"><strong>Enrolled:</strong> {new Date(detailRecord.enrolledDate).toLocaleDateString()}</div>
                <div className="detail-item"><strong>Hours:</strong> {detailRecord.usedHours}h / {detailRecord.totalHours}h ({getProgressPercent(detailRecord.usedHours, detailRecord.totalHours)}%)</div>
                <div className="detail-item"><strong>Days:</strong> {detailRecord.daysAttended} / {detailRecord.totalDays} days</div>
                <div className="detail-item"><strong>Payment:</strong> <span className={detailRecord.paymentStatus}>{detailRecord.paymentStatus === 'paid' ? 'Paid' : 'Pending'} — ${detailRecord.paymentAmount}</span></div>
                <div className="detail-item"><strong>Parent:</strong> {detailRecord.parentName}</div>
                <div className="detail-item"><strong>Parent Email:</strong> {detailRecord.parentEmail}</div>
                {detailRecord.scheduleDay && <div className="detail-item schedule-detail"><strong>Study Day:</strong> {detailRecord.scheduleDay}</div>}
                {detailRecord.scheduleTime && <div className="detail-item schedule-detail"><strong>Study Time:</strong> {detailRecord.scheduleTime}</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDetailModal(false)}>Close</button>
              {canEdit && (
                <>
                  <button className="btn-delete" onClick={() => handleDeleteRecord(detailRecord.id)}>
                    <Icons.Trash /> Delete
                  </button>
                  <button className="btn-save" onClick={() => { setShowDetailModal(false); handleEditRecord(detailRecord); }}>
                    <Icons.Edit /> Edit Record
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="records-info-banner">
        <Icons.Shield />
        <div>
          <strong>Administrator or Teacher Access</strong>
          <p>Teachers and administrators can modify student records. Parents can view their children's progress and contact teachers or administrators for any questions.</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADMINISTRATION PAGE
// ============================================
function AdministrationPage({ user }) {
  // eslint-disable-next-line no-unused-vars
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');

  // Hide teacher management from teacher role — they only manage families
  const isAdminUser = user?.role === 'admin';

  // ---- Manage Teachers (admin-created) ----
  const [managedTeachers, setManagedTeachers] = useState(() => getStoredTeachers());
  const [showAddTeacherForm, setShowAddTeacherForm] = useState(false);
  const [editingManagedId, setEditingManagedId] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '', subject: 'English', phone: '' });
  const [showCredentialId, setShowCredentialId] = useState(null);
  const [credentialCopied, setCredentialCopied] = useState('');

  // ---- Teacher Files / Activity Logs (admin view) ----
  const [expandedTeacherFiles, setExpandedTeacherFiles] = useState(null);
  const [teacherActivityLogs, setTeacherActivityLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('classroom_teacher_activity_logs') || '{}'); } catch { return {}; }
  });

  const saveTeacherLogs = (logs) => {
    setTeacherActivityLogs(logs);
    localStorage.setItem('classroom_teacher_activity_logs', JSON.stringify(logs));
  };

  const logTeacherActivity = (teacherEmail, action, description, details) => {
    const logs = { ...teacherActivityLogs };
    if (!logs[teacherEmail]) logs[teacherEmail] = [];
    const entry = {
      action,
      description,
      details: details || '',
      timestamp: new Date().toISOString()
    };
    if (action === 'login' || action === 'logout') {
      // Record session start/end
      entry.sessionTime = new Date().toLocaleString();
    }
    logs[teacherEmail].unshift(entry);
    // Keep only last 200 entries per teacher
    if (logs[teacherEmail].length > 200) {
      logs[teacherEmail] = logs[teacherEmail].slice(0, 200);
    }
    saveTeacherLogs(logs);
  };

  const getTeacherWorkSummary = (teacherEmail) => {
    const logs = teacherActivityLogs[teacherEmail] || [];
    const logins = logs.filter(l => l.action === 'login');
    const sessionCount = logins.length;
    // Calculate approximate work hours (each session ~2 hours)
    const totalWorkHours = sessionCount * 2;
    // Get unique dates
    const uniqueDates = new Set();
    logs.forEach(l => {
      if (l.timestamp) uniqueDates.add(l.timestamp.split('T')[0]);
    });
    const activityBreakdown = {};
    logs.forEach(l => {
      activityBreakdown[l.action] = (activityBreakdown[l.action] || 0) + 1;
    });
    return {
      totalSessions: sessionCount,
      totalWorkHours,
      activeDays: uniqueDates.size,
      firstActivity: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
      lastActivity: logs.length > 0 ? logs[0].timestamp : null,
      totalActivities: logs.length,
      activityBreakdown
    };
  };

  const getTeacherActivityLogs = (teacherEmail) => {
    return teacherActivityLogs[teacherEmail] || [];
  };

  // ---- Family Accounts (admin & teacher managed) ----
  const [familyAccounts, setFamilyAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('classroom_family_accounts') || '[]'); } catch { return []; }
  });
  const [showAddFamilyForm, setShowAddFamilyForm] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState(null);
  const [newFamily, setNewFamily] = useState({
    parentName: '', parentEmail: '', password: '', phone: '',
    children: [] // { name: '', grade: '', subject: 'English' }
  });
  const [newChild, setNewChild] = useState({ name: '', grade: '', subject: 'English' });
  const [familySearch, setFamilySearch] = useState('');
  const [showFamilyCredId, setShowFamilyCredId] = useState(null);
  const [familyCredCopied, setFamilyCredCopied] = useState('');

  const resetTeacherForm = () => {
    setNewTeacher({ name: '', email: '', password: '', subject: 'English', phone: '' });
    setEditingManagedId(null);
    setShowAddTeacherForm(false);
  };

  const handleCreateTeacher = () => {
    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      alert('Please fill in Name, Email, and Password.');
      return;
    }
    const newId = Date.now();
    const teacher = { ...newTeacher, id: newId, status: 'active', createdAt: new Date().toISOString() };
    const updated = [...managedTeachers, teacher];
    setManagedTeachers(updated);
    saveStoredTeachers(updated);
    // Also add to the display teachers list
    setTeachers(prev => [...prev, {
      id: newId, name: newTeacher.name, email: newTeacher.email,
      subject: newTeacher.subject, phone: newTeacher.phone,
      avatar: '👩‍🏫', status: 'active', assignedStudentIds: []
    }]);
    // Initialize teacher activity log with first entries
    logTeacherActivity(newTeacher.email, 'account_created', 'Account created by administrator', 'Initial setup');
    logTeacherActivity(newTeacher.email, 'profile_set', 'Profile configured — ' + newTeacher.subject, 'Subject: ' + newTeacher.subject);
    resetTeacherForm();
  };

  const handleUpdateTeacher = () => {
    if (!editingManagedId) return;
    const updated = managedTeachers.map(t =>
      t.id === editingManagedId ? { ...t, ...newTeacher } : t
    );
    setManagedTeachers(updated);
    saveStoredTeachers(updated);
    // Update in display list too
    setTeachers(prev => prev.map(t =>
      t.id === editingManagedId ? { ...t, name: newTeacher.name, email: newTeacher.email, subject: newTeacher.subject, phone: newTeacher.phone } : t
    ));
    resetTeacherForm();
  };

  const handleDeleteManagedTeacher = (id) => {
    if (!window.confirm(t('teacherDeleteConfirm'))) return;
    const updated = managedTeachers.filter(t => t.id !== id);
    setManagedTeachers(updated);
    saveStoredTeachers(updated);
    // Toggle status instead of removing from display
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, status: 'inactive' } : t));
  };

  const handleToggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    const updated = managedTeachers.map(t =>
      t.id === id ? { ...t, status: newStatus } : t
    );
    setManagedTeachers(updated);
    saveStoredTeachers(updated);
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const startEditManaged = (teacher) => {
    setNewTeacher({ name: teacher.name, email: teacher.email, password: teacher.password, subject: teacher.subject || 'English', phone: teacher.phone || '' });
    setEditingManagedId(teacher.id);
    setShowAddTeacherForm(true);
  };

  // ===== Family Account CRUD =====
  const resetFamilyForm = () => {
    setNewFamily({ parentName: '', parentEmail: '', password: '', phone: '', children: [] });
    setNewChild({ name: '', grade: '', subject: 'English' });
    setEditingFamilyId(null);
    setShowAddFamilyForm(false);
  };

  const handleEditFamily = (family) => {
    setNewFamily({
      parentName: family.parentName || '',
      parentEmail: family.parentEmail || '',
      password: family.password || '',
      phone: family.phone || '',
      children: (family.children || []).map(c => ({
        name: c.name, grade: c.grade, subject: c.subject || 'English'
      }))
    });
    setEditingFamilyId(family.id);
    setShowAddFamilyForm(true);
    window.scrollTo({ top: document.querySelector('.admin-section')?.offsetTop - 100, behavior: 'smooth' });
  };

  const addChildToNewFamily = () => {
    if (!newChild.name || !newChild.grade) return;
    setNewFamily(prev => ({
      ...prev,
      children: [...prev.children, { ...newChild }]
    }));
    setNewChild({ name: '', grade: '', subject: 'English' });
  };

  const removeChildFromNewFamily = (idx) => {
    setNewFamily(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== idx)
    }));
  };

  const handleCreateFamily = () => {
    if (!newFamily.parentName || !newFamily.parentEmail || !newFamily.password) {
      alert('Please fill in Parent Name, Email, and Password.');
      return;
    }

    if (editingFamilyId) {
      // ----- UPDATE existing family -----
      const updated = familyAccounts.map(f => {
        if (f.id === editingFamilyId) {
          // Map existing children, preserve old child IDs where names match
          const oldChildren = f.children || [];
          const updatedChildren = newFamily.children.map((c, i) => {
            const matchedOld = oldChildren.find(oc => oc.name === c.name);
            return {
              ...c,
              id: matchedOld ? matchedOld.id : f.id + i + 1000, // new children get fresh IDs
              totalHours: matchedOld ? (matchedOld.totalHours || 30) : 30,
              usedHours: matchedOld ? (matchedOld.usedHours || 0) : 0,
              paymentStatus: matchedOld ? (matchedOld.paymentStatus || 'pending') : 'pending',
              enrolledDate: matchedOld ? (matchedOld.enrolledDate || f.createdAt?.split('T')[0]) : new Date().toISOString().split('T')[0]
            };
          });
          return {
            ...f,
            parentName: newFamily.parentName,
            parentEmail: newFamily.parentEmail,
            password: newFamily.password,
            phone: newFamily.phone,
            children: updatedChildren,
            updatedAt: new Date().toISOString()
          };
        }
        return f;
      });
      setFamilyAccounts(updated);
      localStorage.setItem('classroom_family_accounts', JSON.stringify(updated));

      // Update students for the edited family
      const targetFamily = updated.find(f => f.id === editingFamilyId);
      if (targetFamily) {
        const allStudents = getAllStudents();
        // Remove old children of this family
        const filtered = allStudents.filter(s => s.parentId !== editingFamilyId);
        // Add updated children
        const newStudents = targetFamily.children.map(c => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
          subject: c.subject || 'English',
          teacher: allStudents.find(s => s.id === c.id)?.teacher || '',
          totalHours: c.totalHours || 30,
          usedHours: c.usedHours || 0,
          paymentStatus: c.paymentStatus || 'pending',
          parentName: targetFamily.parentName,
          parentEmail: targetFamily.parentEmail,
          parentId: targetFamily.id,
          avatar: '👤',
          enrolledDate: c.enrolledDate || new Date().toISOString().split('T')[0]
        }));
        const mergedStudents = [...filtered, ...newStudents];
        localStorage.setItem('linguaclass_students', JSON.stringify(mergedStudents));
        setStudents(mergedStudents);
      }
      resetFamilyForm();
      showToast('Family account updated successfully!');
    } else {
      // ----- CREATE new family -----
      const familyId = Date.now();
      const family = {
        id: familyId,
        parentName: newFamily.parentName,
        parentEmail: newFamily.parentEmail,
        password: newFamily.password,
        phone: newFamily.phone,
        children: newFamily.children.map((c, i) => ({
          ...c,
          id: familyId + i + 1,
          totalHours: 30,
          usedHours: 0,
          paymentStatus: 'pending',
          enrolledDate: new Date().toISOString().split('T')[0]
        })),
        createdAt: new Date().toISOString()
      };
      const updated = [...familyAccounts, family];
      setFamilyAccounts(updated);
      localStorage.setItem('classroom_family_accounts', JSON.stringify(updated));

      // Also add children as students in the system
      const existingStudents = getAllStudents();
      const newStudents = family.children.map((c, i) => ({
        id: familyId + i + 1,
        name: c.name,
        grade: c.grade,
        subject: c.subject,
        teacher: '',
        totalHours: 30,
        usedHours: 0,
        paymentStatus: 'pending',
        parentName: family.parentName,
        parentEmail: family.parentEmail,
        parentId: familyId,
        avatar: '👤',
        enrolledDate: family.createdAt.split('T')[0]
      }));
      const allStudents = [...existingStudents, ...newStudents];
      localStorage.setItem('linguaclass_students', JSON.stringify(allStudents));
      setStudents(allStudents);
      resetFamilyForm();
      showToast('Family account created successfully!');
    }
  };

  const handleDeleteFamily = (id) => {
    if (!window.confirm('Delete this family account? All associated children will be removed.')) return;
    const updated = familyAccounts.filter(f => f.id !== id);
    setFamilyAccounts(updated);
    localStorage.setItem('classroom_family_accounts', JSON.stringify(updated));
    // Remove children from students list
    const remainingStudents = getAllStudents().filter(s => s.parentId !== id);
    localStorage.setItem('linguaclass_students', JSON.stringify(remainingStudents));
    setStudents(remainingStudents);
    showToast('Family account deleted.');
  };

  const filteredFamilies = familyAccounts.filter(f =>
    f.parentName.toLowerCase().includes(familySearch.toLowerCase()) ||
    f.parentEmail.toLowerCase().includes(familySearch.toLowerCase())
  );

  // Load data from Supabase (fallback to sample data, merged with localStorage)
  useEffect(() => {
    Promise.all([
      fetchTeachers().catch(() => SAMPLE_TEACHERS),
      fetchStudents().catch(() => getAllStudents()),
      fetchContacts().catch(() => SAMPLE_CONTACTS),
    ]).then(([t, s, c]) => {
      setTeachers(t.length > 0 ? t : SAMPLE_TEACHERS);
      setStudents(s.length > 0 ? s : getAllStudents());
      setContacts(c.length > 0 ? c : SAMPLE_CONTACTS);
      setDataLoaded(true);
    });
  }, []);

  // Persist teachers to Supabase
  useEffect(() => {
    if (dataLoaded && teachers.length > 0) {
      // Save all teachers to Supabase
      teachers.forEach(t => {
        updateTeacher(t).catch(() => {});
      });
    }
  }, [teachers, dataLoaded]);

  // Get unassigned students
  const allAssignedIds = teachers.reduce((acc, t) => [...acc, ...t.assignedStudentIds], []);
  const unassignedStudents = students.filter(s => !allAssignedIds.includes(s.id));

  const assignStudent = (teacherId, studentId) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId && !t.assignedStudentIds.includes(studentId)) {
        return { ...t, assignedStudentIds: [...t.assignedStudentIds, studentId] };
      }
      return t;
    }));
  };

  const removeStudent = (teacherId, studentId) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        return { ...t, assignedStudentIds: t.assignedStudentIds.filter(id => id !== studentId) };
      }
      return t;
    }));
  };

  const getStudentById = (id) => students.find(s => s.id === id) || contacts.find(c => c.id === id && c.role === 'Student');

  const filteredUnassigned = unassignedStudents.filter(s =>
    s.name.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const statusColor = (status) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'away': return '#f59e0b';
      case 'offline': return '#94a3b8';
      default: return '#64748b';
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-title">
          <h2><Icons.Admin /> Administration</h2>
          <p>{isAdminUser ? 'Manage teachers and their assigned students' : 'Manage family accounts and students'}</p>
        </div>
        {isAdminUser && (
          <div className="admin-stats-row">
            <div className="admin-stat">
              <span className="admin-stat-val">{teachers.length}</span>
              <span className="admin-stat-lbl">Teachers</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-val">{students.length}</span>
              <span className="admin-stat-lbl">Students</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-val">{allAssignedIds.length}</span>
              <span className="admin-stat-lbl">Assigned</span>
            </div>
            <div className="admin-stat warning">
              <span className="admin-stat-val">{unassignedStudents.length}</span>
              <span className="admin-stat-lbl">Unassigned</span>
            </div>
          </div>
        )}
        {/* Teacher stats: show family account count */}
        {!isAdminUser && (
          <div className="admin-stats-row">
            <div className="admin-stat">
              <span className="admin-stat-val">{familyAccounts.length}</span>
              <span className="admin-stat-lbl">Families</span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-val">{students.length}</span>
              <span className="admin-stat-lbl">Students</span>
            </div>
          </div>
        )}
      </div>

      {/* ======== MANAGE TEACHERS SECTION (admin only) ======== */}
      {isAdminUser && (<>
      <div className="admin-section" style={{marginBottom:'24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <div>
            <h3 style={{margin:0}}><Icons.User /> {t('manageTeachers')}</h3>
            <p style={{margin:'4px 0 0',color:'#64748b',fontSize:'0.85rem'}}>{t('addTeacherDesc')}</p>
          </div>
          <button
            onClick={() => { resetTeacherForm(); setShowAddTeacherForm(true); }}
            style={{
              background:'linear-gradient(135deg, #4f46e5, #7c3aed)', color:'#fff', border:'none',
              padding:'10px 20px', borderRadius:'8px', fontWeight:600, cursor:'pointer', fontSize:'0.9rem',
              display:'flex', alignItems:'center', gap:'6px', boxShadow:'0 2px 8px rgba(79,70,229,0.3)'
            }}
          >
            <Icons.Plus /> {t('addTeacher')}
          </button>
        </div>

        {/* Add/Edit Teacher Form */}
        {showAddTeacherForm && (
          <div style={{
            background:'#f8fafc', borderRadius:'12px', padding:'20px', marginBottom:'16px',
            border:'1px solid #e2e8f0'
          }}>
            <h4 style={{margin:'0 0 16px',fontSize:'0.95rem',color:'#334155'}}>
              {editingManagedId ? t('editTeacher') : t('createTeacher')}
            </h4>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>
                  {t('teacherName')} *
                </label>
                <input type="text" value={newTeacher.name}
                  onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                  placeholder="e.g. Dr. Sarah Mitchell"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>
                  {t('teacherEmail')} *
                </label>
                <input type="email" value={newTeacher.email}
                  onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                  placeholder="teacher@school.com"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>
                  {t('teacherPassword')} *
                </label>
                <input type="text" value={newTeacher.password}
                  onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                  placeholder="Min. 6 characters"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>
                  {t('teacherSubject')}
                </label>
                <select value={newTeacher.subject}
                  onChange={e => setNewTeacher({...newTeacher, subject: e.target.value})}
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                >
                  <option>English</option><option>Mathematics</option><option>Science</option>
                  <option>History</option><option>Art</option><option>Music</option><option>Computer Science</option>
                </select>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>
                  {t('teacherPhone')}
                </label>
                <input type="tel" value={newTeacher.phone}
                  onChange={e => setNewTeacher({...newTeacher, phone: e.target.value})}
                  placeholder="+1 234 567 8900"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box',maxWidth:'400px'}}
                />
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
              <button onClick={editingManagedId ? handleUpdateTeacher : handleCreateTeacher}
                style={{background:'#4f46e5',color:'#fff',border:'none',padding:'10px 24px',borderRadius:'8px',fontWeight:600,cursor:'pointer'}}
              >
                {editingManagedId ? t('save') : t('createTeacher')}
              </button>
              <button onClick={resetTeacherForm}
                style={{background:'#e2e8f0',color:'#475569',border:'none',padding:'10px 24px',borderRadius:'8px',fontWeight:600,cursor:'pointer'}}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Managed Teachers List */}
        {managedTeachers.length === 0 ? (
          <div style={{textAlign:'center',padding:'32px',color:'#94a3b8',fontSize:'0.9rem'}}>
            <span style={{fontSize:'2rem',display:'block',marginBottom:'8px'}}>👩‍🏫</span>
            {t('noTeachers')}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',gap:'12px'}}>
            {managedTeachers.map(teacher => (
              <div key={teacher.id} style={{
                background:'#fff', borderRadius:'10px', padding:'16px', border:'1px solid #e2e8f0',
                boxShadow:'0 1px 3px rgba(0,0,0,0.05)', position:'relative'
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'0.95rem',color:'#1e293b'}}>
                      <span style={{marginRight:'8px'}}>{teacher.avatar || '👩‍🏫'}</span>
                      {teacher.name}
                    </div>
                    <div style={{fontSize:'0.8rem',color:'#64748b',marginTop:'2px'}}>{teacher.email}</div>
                  </div>
                  <span style={{
                    fontSize:'0.7rem',fontWeight:700,padding:'3px 10px',borderRadius:'20px',
                    background: teacher.status === 'active' ? '#dcfce7' : '#fee2e2',
                    color: teacher.status === 'active' ? '#16a34a' : '#dc2626'
                  }}>
                    {teacher.status === 'active' ? t('enabled') : t('disabled')}
                  </span>
                </div>
                <div style={{fontSize:'0.82rem',color:'#475569',marginBottom:'10px'}}>
                  <span style={{background:'#f1f5f9',padding:'2px 10px',borderRadius:'4px',marginRight:'6px'}}>
                    📖 {teacher.subject}
                  </span>
                  {teacher.phone && <span style={{color:'#94a3b8'}}>📱 {teacher.phone}</span>}
                </div>

                {/* Credentials toggle */}
                {showCredentialId === teacher.id && (
                  <div style={{
                    background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'8px',padding:'10px 12px',marginBottom:'10px',
                    fontSize:'0.82rem'
                  }}>
                    <div style={{fontWeight:700,marginBottom:'6px',color:'#92400e'}}>{t('teacherCredentials')}</div>
                    <div style={{marginBottom:'4px'}}>
                      <span style={{color:'#92400e',fontWeight:600}}>{t('teacherLoginEmail')}:</span> {teacher.email}
                    </div>
                    <div>
                      <span style={{color:'#92400e',fontWeight:600}}>{t('teacherLoginPassword')}:</span> {teacher.password}
                    </div>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`Email: ${teacher.email}\nPassword: ${teacher.password}`).then(() => {
                        setCredentialCopied(teacher.id.toString());
                        setTimeout(() => setCredentialCopied(''), 2000);
                      });
                    }} style={{
                      marginTop:'8px',background:'#fef3c7',border:'1px solid #fbbf24',color:'#92400e',
                      padding:'4px 12px',borderRadius:'4px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600
                    }}>
                      📋 {credentialCopied === teacher.id.toString() ? t('credentialsCopied') : t('copyCredentials')}
                    </button>
                  </div>
                )}

                {/* --- Teacher Files (Activity & Work Log) --- */}
                {(() => {
                  const logs = getTeacherActivityLogs(teacher.email);
                  const summary = getTeacherWorkSummary(teacher.email);
                  const isExpanded = expandedTeacherFiles === teacher.id;
                  return (
                    <>
                      <button
                        onClick={() => setExpandedTeacherFiles(isExpanded ? null : teacher.id)}
                        style={{
                          background: isExpanded ? '#ede9fe' : '#f5f3ff',
                          border: '1px solid #c4b5fd', color: '#6d28d9',
                          padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '0.78rem', fontWeight: 600, display: 'block', marginTop: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        📁 {isExpanded ? 'Hide Teacher Files' : 'View Teacher Files'}
                      </button>

                      {isExpanded && (
                        <div style={{
                          background: '#faf5ff', border: '2px solid #c4b5fd', borderRadius: '12px',
                          padding: '20px', marginTop: '10px', animation: 'fadeIn 0.2s'
                        }}>
                          {/* Summary Stats */}
                          <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ margin: '0 0 12px', color: '#5b21b6', fontSize: '0.95rem' }}>
                              📊 Teacher Work Summary
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                              {[
                                { label: 'Total Sessions', value: summary.totalSessions, icon: '🔄', color: '#7c3aed' },
                                { label: 'Est. Work Hours', value: summary.totalWorkHours + 'h', icon: '⏱️', color: '#059669' },
                                { label: 'Active Days', value: summary.activeDays, icon: '📅', color: '#d97706' },
                                { label: 'Total Activities', value: summary.totalActivities, icon: '📝', color: '#dc2626' },
                              ].map((stat, i) => (
                                <div key={i} style={{
                                  background: '#fff', padding: '10px', borderRadius: '8px',
                                  border: '1px solid #e9d5ff', textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '1.2rem' }}>{stat.icon}</div>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{stat.label}</div>
                                </div>
                              ))}
                            </div>
                            {summary.lastActivity && (
                              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '16px' }}>
                                <span>📥 First: {new Date(summary.firstActivity).toLocaleString()}</span>
                                <span>📤 Last: {new Date(summary.lastActivity).toLocaleString()}</span>
                              </div>
                            )}
                          </div>

                          {/* Activity Breakdown */}
                          {Object.keys(summary.activityBreakdown).length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <h4 style={{ margin: '0 0 8px', color: '#5b21b6', fontSize: '0.9rem' }}>📈 Activity Breakdown</h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {Object.entries(summary.activityBreakdown).map(([action, count]) => (
                                  <span key={action} style={{
                                    background: '#ede9fe', color: '#6d28d9', padding: '3px 10px',
                                    borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600
                                  }}>
                                    {action.replace(/_/g, ' ')}: {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Activity Log */}
                          <div>
                            <h4 style={{ margin: '0 0 8px', color: '#5b21b6', fontSize: '0.9rem' }}>
                              📋 Activity Log {logs.length > 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({logs.length} entries)</span>}
                            </h4>
                            {logs.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.82rem' }}>
                                No activity recorded yet for this teacher.
                              </div>
                            ) : (
                              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                  <thead>
                                    <tr style={{ background: '#f3e8ff', position: 'sticky', top: 0 }}>
                                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#5b21b6' }}>Time</th>
                                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#5b21b6' }}>Action</th>
                                      <th style={{ padding: '6px 8px', textAlign: 'left', color: '#5b21b6' }}>Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {logs.slice(0, 50).map((log, i) => (
                                      <tr key={i} style={{ borderBottom: '1px solid #f3e8ff', background: i % 2 === 0 ? '#fff' : '#faf5ff' }}>
                                        <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                                          {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '5px 8px' }}>
                                          <span style={{
                                            background:
                                              log.action === 'login' ? '#dcfce7' :
                                              log.action === 'logout' ? '#fee2e2' :
                                              log.action === 'account_created' ? '#dbeafe' :
                                              log.action === 'student_view' ? '#fef3c7' :
                                              log.action === 'calendar_event' ? '#e0e7ff' :
                                              log.action === 'video_session' ? '#fce7f3' :
                                              log.action === 'file_activity' ? '#d1fae5' :
                                              log.action === 'contact_action' ? '#f3e8ff' :
                                              '#f1f5f9',
                                            color:
                                              log.action === 'login' ? '#16a34a' :
                                              log.action === 'logout' ? '#dc2626' :
                                              log.action === 'account_created' ? '#2563eb' :
                                              '#475569',
                                            padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.68rem'
                                          }}>
                                            {log.action.replace(/_/g, ' ')}
                                          </span>
                                        </td>
                                        <td style={{ padding: '5px 8px', color: '#334155' }}>{log.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Action buttons */}
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'8px'}}>
                  <button onClick={() => setShowCredentialId(showCredentialId === teacher.id ? null : teacher.id)}
                    style={{
                      background:'#fef3c7',border:'1px solid #fbbf24',color:'#92400e',
                      padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600
                    }}
                  >
                    🔑 {showCredentialId === teacher.id ? t('hideCredentials') : t('showCredentials')}
                  </button>
                  <button onClick={() => startEditManaged(teacher)}
                    style={{background:'#e0e7ff',border:'none',color:'#4338ca',padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                    ✏️ {t('edit')}
                  </button>
                  <button onClick={() => handleToggleStatus(teacher.id, teacher.status)}
                    style={{
                      background: teacher.status === 'active' ? '#fee2e2' : '#dcfce7',
                      border:'none',
                      color: teacher.status === 'active' ? '#dc2626' : '#16a34a',
                      padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600
                    }}>
                    {teacher.status === 'active' ? '🚫 Disable' : '✅ Enable'}
                  </button>
                  <button onClick={() => handleDeleteManagedTeacher(teacher.id)}
                    style={{background:'#fee2e2',border:'none',color:'#dc2626',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ======== END MANAGE TEACHERS ======== */}

      {/* Teachers Grid */}
      <div className="admin-section">
        <h3>Teachers & Assigned Students</h3>
        <div className="admin-teachers-grid">
          {teachers.map(teacher => {
            const assignedStudents = teacher.assignedStudentIds.map(id => getStudentById(id)).filter(Boolean);
            const isExpanded = expandedTeacher === teacher.id;
            return (
              <div key={teacher.id} className={`admin-teacher-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="admin-teacher-header" onClick={() => setExpandedTeacher(isExpanded ? null : teacher.id)}>
                  <div className="admin-teacher-info">
                    <span className="admin-teacher-avatar">{teacher.avatar}</span>
                    <div>
                      <h4>{teacher.name}</h4>
                      <span className="admin-teacher-subject">{teacher.subject}</span>
                    </div>
                  </div>
                  <div className="admin-teacher-meta">
                    <span className="admin-teacher-status" style={{ color: statusColor(teacher.status) }}>
                      ● {teacher.status}
                    </span>
                    <span className="admin-teacher-count">
                      <Icons.Users /> {assignedStudents.length} students
                    </span>
                    <span className={`admin-expand-icon ${isExpanded ? 'open' : ''}`}>
                      <Icons.ChevronDown />
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="admin-teacher-body">
                    {assignedStudents.length === 0 ? (
                      <div className="admin-no-students">No students assigned yet</div>
                    ) : (
                      <ul className="admin-assigned-list">
                        {assignedStudents.map(student => (
                          <li key={student.id} className="admin-assigned-item">
                            <span className="admin-student-avatar">{student.avatar || '👤'}</span>
                            <div className="admin-student-info">
                              <strong>{student.name}</strong>
                              <span>{student.grade || student.subject}</span>
                            </div>
                            <button
                              className="admin-remove-btn"
                              onClick={() => removeStudent(teacher.id, student.id)}
                              title="Remove student"
                            >
                              <Icons.MinusCircle /> Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add student dropdown */}
                    <div className="admin-add-section">
                      <input
                        type="text"
                        placeholder="Search students to assign..."
                        value={searchStudent}
                        onChange={e => setSearchStudent(e.target.value)}
                        className="admin-search-input"
                      />
                      <div className="admin-addable-list">
                        {filteredUnassigned.map(student => (
                          <button
                            key={student.id}
                            className="admin-addable-item"
                            onClick={() => { assignStudent(teacher.id, student.id); setSearchStudent(''); }}
                          >
                            <span>{student.avatar || '👤'}</span>
                            <span className="admin-addable-name">{student.name}</span>
                            <span className="admin-addable-grade">{student.grade}</span>
                            <Icons.PlusCircle />
                          </button>
                        ))}
                        {filteredUnassigned.length === 0 && searchStudent && (
                          <div className="admin-no-results">No matching unassigned students</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Students Alert */}
      {unassignedStudents.length > 0 && (
        <div className="admin-alert-section">
          <button className="admin-alert-btn" onClick={() => setShowUnassigned(!showUnassigned)}>
            <Icons.Users /> {unassignedStudents.length} unassigned students need a teacher
            <Icons.ChevronDown />
          </button>
          {showUnassigned && (
            <div className="admin-unassigned-list">
              {unassignedStudents.map(student => (
                <div key={student.id} className="admin-unassigned-item">
                  <span>{student.avatar || '👤'}</span>
                  <span>{student.name}</span>
                  <span className="admin-unassigned-grade">{student.grade}</span>
                  <select
                    className="admin-quick-assign"
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) {
                        assignStudent(parseInt(e.target.value), student.id);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Assign to...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </>)}

      {/* ======== FAMILY ACCOUNTS SECTION ======== */}
      <div className="admin-section" style={{marginTop:'32px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <div>
            <h3 style={{margin:0}}>🏠 Family Accounts</h3>
            <p style={{margin:'4px 0 0',color:'#64748b',fontSize:'0.85rem'}}>Create family accounts with credentials — families use these to log in and view their children</p>
          </div>
          <button
            onClick={() => { resetFamilyForm(); setShowAddFamilyForm(true); }}
            style={{
              background:'linear-gradient(135deg, #059669, #10b981)', color:'#fff', border:'none',
              padding:'10px 20px', borderRadius:'8px', fontWeight:600, cursor:'pointer', fontSize:'0.9rem',
              display:'flex', alignItems:'center', gap:'6px', boxShadow:'0 2px 8px rgba(5,150,105,0.3)'
            }}
          >
            <Icons.Plus /> Create Family Account
          </button>
        </div>

        {/* Search */}
        <div style={{marginBottom:'16px'}}>
          <input
            type="text"
            value={familySearch}
            onChange={e => setFamilySearch(e.target.value)}
            placeholder="🔍 Search families by name or email..."
            style={{
              width:'100%',maxWidth:'400px',padding:'10px 16px',border:'1px solid #e2e8f0',
              borderRadius:'8px',fontSize:'0.9rem',boxSizing:'border-box'
            }}
          />
        </div>

        {/* Add Family Form */}
        {showAddFamilyForm && (
          <div style={{
            background:'#f0fdf4', borderRadius:'12px', padding:'20px', marginBottom:'16px',
            border:'1px solid #bbf7d0'
          }}>
            <h4 style={{margin:'0 0 16px',fontSize:'0.95rem',color:'#065f46'}}>{editingFamilyId ? 'Edit Family Account' : 'Create Family Account'}</h4>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>Parent Name *</label>
                <input type="text" value={newFamily.parentName}
                  onChange={e => setNewFamily({...newFamily, parentName: e.target.value})}
                  placeholder="e.g. Michael Thompson"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>Parent Email *</label>
                <input type="email" value={newFamily.parentEmail}
                  onChange={e => setNewFamily({...newFamily, parentEmail: e.target.value})}
                  placeholder="parent@email.com"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>Login Password *</label>
                <input type="text" value={newFamily.password}
                  onChange={e => setNewFamily({...newFamily, password: e.target.value})}
                  placeholder="Min. 6 characters"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{fontSize:'0.8rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'4px'}}>Phone (optional)</label>
                <input type="tel" value={newFamily.phone}
                  onChange={e => setNewFamily({...newFamily, phone: e.target.value})}
                  placeholder="+1 234 567 8900"
                  style={{width:'100%',padding:'8px 12px',border:'1px solid #cbd5e1',borderRadius:'6px',fontSize:'0.9rem',boxSizing:'border-box'}}
                />
              </div>
            </div>

            {/* Children Section */}
            <div style={{marginTop:'16px',padding:'12px',background:'#fff',borderRadius:'8px',border:'1px solid #d1fae5'}}>
              <h5 style={{margin:'0 0 10px',fontSize:'0.85rem',color:'#065f46'}}>👧👦 Children</h5>
              {/* Existing children in form */}
              {newFamily.children.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'10px'}}>
                  {newFamily.children.map((child, idx) => (
                    <span key={idx} style={{
                      background:'#ecfdf5',border:'1px solid #6ee7b7',borderRadius:'20px',
                      padding:'4px 12px',fontSize:'0.82rem',display:'inline-flex',alignItems:'center',gap:'6px'
                    }}>
                      {child.name} ({child.grade} - {child.subject})
                      <button onClick={() => removeChildFromNewFamily(idx)}
                        style={{background:'none',border:'none',cursor:'pointer',fontSize:'0.8rem',padding:0,lineHeight:1}}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              {/* Add child form */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:'8px',alignItems:'end'}}>
                <div>
                  <label style={{fontSize:'0.75rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'2px'}}>Child Name</label>
                  <input type="text" value={newChild.name}
                    onChange={e => setNewChild({...newChild, name: e.target.value})}
                    placeholder="e.g. Emma"
                    style={{width:'100%',padding:'6px 10px',border:'1px solid #cbd5e1',borderRadius:'4px',fontSize:'0.85rem',boxSizing:'border-box'}}
                  />
                </div>
                <div>
                  <label style={{fontSize:'0.75rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'2px'}}>Grade</label>
                  <input type="text" value={newChild.grade}
                    onChange={e => setNewChild({...newChild, grade: e.target.value})}
                    placeholder="e.g. Grade 5"
                    style={{width:'100%',padding:'6px 10px',border:'1px solid #cbd5e1',borderRadius:'4px',fontSize:'0.85rem',boxSizing:'border-box'}}
                  />
                </div>
                <div>
                  <label style={{fontSize:'0.75rem',fontWeight:600,color:'#475569',display:'block',marginBottom:'2px'}}>Subject</label>
                  <select value={newChild.subject}
                    onChange={e => setNewChild({...newChild, subject: e.target.value})}
                    style={{width:'100%',padding:'6px 10px',border:'1px solid #cbd5e1',borderRadius:'4px',fontSize:'0.85rem',boxSizing:'border-box'}}
                  >
                    <option>English</option><option>Mathematics</option><option>Science</option>
                    <option>History</option><option>Art</option><option>Music</option>
                  </select>
                </div>
                <button onClick={addChildToNewFamily}
                  style={{
                    background:'#10b981',color:'#fff',border:'none',padding:'7px 14px',
                    borderRadius:'6px',cursor:'pointer',fontWeight:600,fontSize:'0.85rem',whiteSpace:'nowrap'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
              <button onClick={handleCreateFamily}
                style={{background:'#059669',color:'#fff',border:'none',padding:'10px 24px',borderRadius:'8px',fontWeight:600,cursor:'pointer'}}
              >
                {editingFamilyId ? 'Update Family Account' : 'Create Family Account'}
              </button>
              <button onClick={resetFamilyForm}
                style={{background:'#e2e8f0',color:'#475569',border:'none',padding:'10px 24px',borderRadius:'8px',fontWeight:600,cursor:'pointer'}}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Family Accounts List */}
        {filteredFamilies.length === 0 ? (
          <div style={{textAlign:'center',padding:'32px',color:'#94a3b8',fontSize:'0.9rem'}}>
            <span style={{fontSize:'2rem',display:'block',marginBottom:'8px'}}>🏠</span>
            {familySearch ? 'No families match your search' : 'No family accounts yet. Create one to get started.'}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))',gap:'12px'}}>
            {filteredFamilies.map(family => (
              <div key={family.id} style={{
                background:'#fff', borderRadius:'10px', padding:'16px', border:'1px solid #e2e8f0',
                boxShadow:'0 1px 3px rgba(0,0,0,0.05)', position:'relative'
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'0.95rem',color:'#1e293b'}}>
                      <span style={{marginRight:'6px'}}>👨‍👩‍👧</span>
                      {family.parentName}
                    </div>
                    <div style={{fontSize:'0.8rem',color:'#64748b',marginTop:'2px'}}>{family.parentEmail}</div>
                    {family.phone && <div style={{fontSize:'0.78rem',color:'#94a3b8'}}>📱 {family.phone}</div>}
                  </div>
                  <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                    <button onClick={() => handleEditFamily(family)}
                      style={{background:'#e0e7ff',border:'none',color:'#4338ca',padding:'4px 8px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDeleteFamily(family.id)}
                      style={{background:'#fee2e2',border:'none',color:'#dc2626',padding:'4px 8px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Credentials toggle */}
                {showFamilyCredId === family.id && (
                  <div style={{
                    background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'8px',padding:'10px 12px',marginBottom:'10px',
                    fontSize:'0.82rem'
                  }}>
                    <div style={{fontWeight:700,marginBottom:'6px',color:'#92400e'}}>🔑 Family Login Credentials</div>
                    <div style={{marginBottom:'4px'}}>
                      <span style={{color:'#92400e',fontWeight:600}}>Email:</span> {family.parentEmail}
                    </div>
                    <div>
                      <span style={{color:'#92400e',fontWeight:600}}>Password:</span> {family.password}
                    </div>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`Email: ${family.parentEmail}\nPassword: ${family.password}`).then(() => {
                        setFamilyCredCopied(family.id.toString());
                        setTimeout(() => setFamilyCredCopied(''), 2000);
                      });
                    }} style={{
                      marginTop:'8px',background:'#fef3c7',border:'1px solid #fbbf24',color:'#92400e',
                      padding:'4px 12px',borderRadius:'4px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600
                    }}>
                      📋 {familyCredCopied === family.id.toString() ? 'Copied!' : 'Copy Credentials'}
                    </button>
                  </div>
                )}

                <button onClick={() => setShowFamilyCredId(showFamilyCredId === family.id ? null : family.id)}
                  style={{
                    background:'#fef3c7',border:'1px solid #fbbf24',color:'#92400e',
                    padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,marginBottom:'10px'
                  }}
                >
                  🔑 {showFamilyCredId === family.id ? 'Hide Credentials' : 'Show Credentials'}
                </button>

                {/* Children list */}
                <div style={{marginTop:'8px'}}>
                  <div style={{fontWeight:600,fontSize:'0.82rem',color:'#475569',marginBottom:'6px'}}>
                    👧👦 Children ({family.children.length})
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                    {family.children.map((child, idx) => (
                      <div key={idx} style={{
                        background:'#f8fafc',padding:'6px 10px',borderRadius:'6px',
                        fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'8px'
                      }}>
                        <span style={{fontWeight:600,color:'#1e293b'}}>{child.name}</span>
                        <span style={{color:'#64748b'}}>{child.grade}</span>
                        <span style={{background:'#e0e7ff',color:'#4338ca',padding:'1px 8px',borderRadius:'4px',fontSize:'0.72rem'}}>
                          {child.subject}
                        </span>
                        <span style={{marginLeft:'auto',color:'#94a3b8',fontSize:'0.72rem'}}>
                          {child.totalHours}h total | {child.usedHours}h used
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{marginTop:'8px',fontSize:'0.72rem',color:'#94a3b8'}}>
                  Created: {new Date(family.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ======== END FAMILY ACCOUNTS ======== */}
    </div>
  );
}

// ============================================
// CONTACTS PAGE
// ============================================
function ContactsPage({ user, setCurrentPage }) {
  const { t } = useTranslation();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isParent = user?.role === 'parent';
  const isStudentRole = user?.role === 'student';
  // Only admin and teacher can modify contacts
  const canModify = isAdmin || isTeacher;
  // Parent can only view, not modify
  const canView = isAdmin || isTeacher || isParent;
  const [contacts, setContacts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareAppCopied, setShareAppCopied] = useState(false);
  // Join room with code
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  // Install app
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  // Add contact modal (only for admin/teacher)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: 'Student', email: '', phone: '', subject: '', student: '' });
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ---- Capture install prompt ----
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ---- Detect room from URL ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashRoom = window.location.hash.replace('#', '').replace('?room=', '');
    const roomFromUrl = params.get('room') || (hashRoom.startsWith('room-') ? hashRoom : '');
    if (roomFromUrl) {
      setJoinCode(roomFromUrl);
    }
  }, []);

  // Load from Supabase
  useEffect(() => {
    Promise.all([
      fetchContacts().catch(() => SAMPLE_CONTACTS),
      fetchTeachers().catch(() => SAMPLE_TEACHERS),
    ]).then(([c, t]) => {
      setContacts(c.length > 0 ? c : SAMPLE_CONTACTS);
      setTeachers(t.length > 0 ? t : SAMPLE_TEACHERS);
      setDataLoaded(true);
    });
  }, []);

  // Persist contacts
  useEffect(() => {
    if (dataLoaded && contacts.length > 0) {
      saveContacts(contacts).catch(() => {});
    }
  }, [contacts, dataLoaded]);

  // Visible contacts: role-based filtering
  // - Admin sees all contacts
  // - Teacher sees only assigned students + all teachers/parents
  // - Parent sees only their own child's contacts (student + child's teacher)
  // - Student sees all (limited)
  const currentTeacher = teachers.find(t => t.email === user?.email);
  const myAssignedStudentIds = currentTeacher?.assignedStudentIds || [];
  // Get parent's linked child student IDs (from all persisted students)
  const allStudentsForParent = getAllStudents();
  const parentChildIds = isParent
    ? allStudentsForParent.filter(s => s.parentId === user.parentId).map(s => s.id)
    : [];
  // Get parent's linked child names
  const parentChildNames = isParent
    ? allStudentsForParent.filter(s => s.parentId === user.parentId).map(s => s.name)
    : [];
  // Get teachers assigned to parent's children
  const parentChildTeacherNames = isParent
    ? allStudentsForParent.filter(s => s.parentId === user.parentId).map(s => s.teacher)
    : [];

  const visibleContacts = isAdmin
    ? contacts
    : isTeacher
      ? contacts.filter(c => {
          if (c.role === 'Teacher' || c.role === 'Parent') return true;
          if (c.role === 'Student') return myAssignedStudentIds.includes(c.id);
          return false;
        })
      : isParent
        ? contacts.filter(c => {
            // Parent sees: their own contact, their child(ren)'s student contacts,
            // and the teachers assigned to their children
            if (c.email === user?.email) return true; // parent's own contact
            if (c.role === 'Student' && parentChildNames.includes(c.name)) return true; // child's student contact
            if (c.role === 'Teacher' && parentChildTeacherNames.includes(c.name)) return true; // child's teacher
            // Also match by student field for parent-type contacts
            if (c.student && parentChildNames.includes(c.student)) return true;
            return false;
          })
        : contacts; // Student sees all (unchanged for now)

  const filteredContacts = visibleContacts.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q);
  });


  // ---- Join Room with Code ----
  const handleJoinWithCode = () => {
    const code = joinCode.trim();
    if (!code) { setJoinError('Please enter a room code'); return; }
    if (code.length < 4) { setJoinError('Room code is too short'); return; }
    setJoinError('');
    // Navigate to video room with the code
    window.location.hash = `?room=${encodeURIComponent(code)}`;
    setCurrentPage('video');
  };

  // ---- Install App ----
  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setInstallPrompt(null);
    } else {
      // Fallback: show instructions
      alert('To install: open this page in Chrome/Edge, tap the menu (⋮) and select "Add to Home Screen" or "Install app".');
    }
  };

  // ---- Share App ----
  const appUrl = `${window.location.origin}${window.location.pathname}`;
  const shareApp = () => {
    if (navigator.share) {
      navigator.share({ title: 'Linguaclass - Online Classroom', text: 'Join my online classroom on Linguaclass!', url: appUrl }).catch(() => {});
    } else {
      copyAppLink();
    }
  };
  const copyAppLink = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setShareAppCopied(true);
      setTimeout(() => setShareAppCopied(false), 2500);
    }).catch(() => {});
  };

  // ---- Add Contact ----
  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.email.trim()) return;
    const id = Date.now();
    const contact = {
      id, name: newContact.name.trim(), role: newContact.role,
      email: newContact.email.trim(), phone: newContact.phone.trim() || '',
      subject: newContact.subject.trim() || '',
      student: newContact.role === 'Parent' ? (newContact.student.trim() || '') : undefined,
      avatar: newContact.role === 'Teacher' ? '👩‍🏫' : newContact.role === 'Student' ? '👤' : '👨',
      status: 'offline', lastActive: 'Never',
    };
    setContacts(prev => [contact, ...prev]);
    setShowAddModal(false);
    setNewContact({ name: '', role: 'Student', email: '', phone: '', subject: '', student: '' });
  };

  const openAddModal = () => {
    setNewContact({ name: '', role: 'Student', email: '', phone: '', subject: '', student: '' });
    setShowAddModal(true);
  };

  // ---- Remove Contact ----
  const handleRemoveContact = (contact) => {
    setDeleteTarget(contact);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setContacts(prev => prev.filter(c => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const cancelDelete = () => setDeleteTarget(null);

  // ---- Call Contact ----
  const handleCallContact = (contact) => {
    const room = 'room-' + Math.random().toString(36).substr(2, 6);
    // Set both hash (for this page) and search params (for video page)
    const url = new URL(window.location.href);
    url.searchParams.set('room', room);
    window.history.replaceState({}, '', url.toString());
    // Also store in sessionStorage so video page can detect it
    sessionStorage.setItem('pending_room', room);
    sessionStorage.setItem('pending_call_contact', contact.name);
    setCurrentPage('video');
  };

  const statusColor = (status) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'away': return '#f59e0b';
      case 'offline': return '#94a3b8';
      default: return '#64748b';
    }
  };

  const roleBadgeColor = (role) => {
    switch(role) {
      case 'Teacher': return '#8b5cf6';
      case 'Student': return '#3b82f6';
      case 'Parent': return '#f59e0b';
      default: return '#64748b';
    }
  };

  return (
    <div className="contacts-page">
      {/* ---- Install App Banner ---- */}
      {showInstallBanner && (
        <div className="install-app-banner">
          <div className="install-app-banner-icon">📲</div>
          <div className="install-app-banner-text">
            <strong>Install Linguaclass App</strong>
            <p>Add to your home screen for quick access — works offline!</p>
          </div>
          <div className="install-app-banner-actions">
            <button className="btn-install-app" onClick={handleInstallApp}>
              <Icons.Download /> Install App
            </button>
            <button className="btn-dismiss-install" onClick={() => setShowInstallBanner(false)} title="Dismiss">
              <Icons.X />
            </button>
          </div>
        </div>
      )}

      {/* ---- Join Room with Code ---- */}
      <div className="join-room-section">
        <div className="join-room-header">
          <span className="join-room-icon">🔑</span>
          <h3>Join a Room</h3>
        </div>
        <p className="join-room-desc">Received a room code from someone? Enter it here to join their video classroom.</p>
        <div className="join-room-input-row">
          <input
            type="text"
            className="join-room-input"
            placeholder="Paste room code here (e.g. room-abc123)"
            value={joinCode}
            onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
          />
          <button className="btn-join-room" onClick={handleJoinWithCode}>
            <Icons.Video /> Join
          </button>
          {!showInstallBanner && (
            <button className="btn-download-app" onClick={handleInstallApp} title="Download / Install App">
              <Icons.Download />
            </button>
          )}
        </div>
        {joinError && <p className="join-room-error">{joinError}</p>}
      </div>

      {/* ---- Share App Banner ---- */}
      <div className="share-app-banner">
        <div className="share-app-banner-icon">📢</div>
        <div className="share-app-banner-text">
          <h3>Share Linguaclass</h3>
          <p>Send this link to anyone — they can join your video classroom instantly.</p>
        </div>
        <div className="share-app-banner-actions">
          <div className="share-app-url-box">
            <code>{appUrl}</code>
            <button className="btn-copy-app-link" onClick={copyAppLink}>
              <Icons.Copy /> {shareAppCopied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <button className="btn-share-app" onClick={shareApp}>
            <Icons.Share /> Share App
          </button>
        </div>
      </div>

      {/* ---- Toolbar ---- */}
      <div className="contacts-toolbar">
        <div className="contacts-search">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search contacts by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        {canModify && (
          <button className="btn-add-contact" onClick={openAddModal}>
            <Icons.PlusCircle /> Add Contact
          </button>
        )}
      </div>

      {/* ---- Contact List ---- */}
      <div className="contacts-grid">
        {filteredContacts.length === 0 ? (
          <div className="contacts-empty">
            <Icons.Search />
            <h3>No contacts found</h3>
            <p>Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.id} className="contact-card">
              <div className="contact-avatar">
                <span className="contact-emoji">{contact.avatar}</span>
                <span className="contact-status-dot" style={{ background: statusColor(contact.status) }} title={contact.status}></span>
              </div>
              <div className="contact-body">
                <div className="contact-header">
                  <h4 className="contact-name">{contact.name}</h4>
                  <span className="contact-role-badge" style={{ background: roleBadgeColor(contact.role) }}>
                    {contact.role}
                  </span>
                </div>
                <div className="contact-details">
                  <span className="contact-detail">
                    <Icons.Mail /> {contact.email}
                  </span>
                  {contact.subject && (
                    <span className="contact-detail">
                      <Icons.Book /> {contact.subject}
                    </span>
                  )}
                  {contact.student && (
                    <span className="contact-detail">
                      <Icons.User /> Child: {contact.student}
                    </span>
                  )}
                </div>
                <div className="contact-footer">
                  <button className="btn-call-contact" onClick={() => handleCallContact(contact)}>
                    <Icons.Video /> Start Call
                  </button>
                  {canModify && (
                    <button className="btn-remove-contact" onClick={() => handleRemoveContact(contact)} title="Remove from contacts">
                      <Icons.Trash />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ---- Add Contact Modal ---- */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="invite-modal contact-add-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddModal(false)}>
              <Icons.X />
            </button>
            <div className="invite-modal-header">
              <h2>Add New Contact</h2>
              <p>Fill in the details below to add a new contact</p>
            </div>
            <div className="add-contact-form">
              <label>Full Name *</label>
              <input type="text" placeholder="e.g. John Doe" value={newContact.name}
                onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
              <label>Email *</label>
              <input type="email" placeholder="e.g. john@email.com" value={newContact.email}
                onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
              <label>Role</label>
              <select value={newContact.role} onChange={e => setNewContact({ ...newContact, role: e.target.value })}>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
                <option value="Parent">Parent</option>
              </select>
              <label>Phone</label>
              <input type="text" placeholder="e.g. (555) 123-4567" value={newContact.phone}
                onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
              <label>Subject</label>
              <input type="text" placeholder="e.g. English" value={newContact.subject}
                onChange={e => setNewContact({ ...newContact, subject: e.target.value })} />
              {newContact.role === 'Parent' && (
                <>
                  <label>Child's Name</label>
                  <input type="text" placeholder="e.g. Emma Thompson" value={newContact.student}
                    onChange={e => setNewContact({ ...newContact, student: e.target.value })} />
                </>
              )}
            </div>
            <div className="invite-modal-footer">
              <button className="btn-go-room" onClick={handleAddContact}
                disabled={!newContact.name.trim() || !newContact.email.trim()}>
                <Icons.PlusCircle /> Add Contact
              </button>
              <button className="btn-close-modal" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation Modal ---- */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="invite-modal delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="invite-modal-header">
              <span style={{ fontSize: 48, marginBottom: 12, display: 'block' }}>🗑️</span>
              <h2>Remove Contact</h2>
              <p>Are you sure you want to remove <strong>{deleteTarget.name}</strong> from your contacts?</p>
              <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 8 }}>This action cannot be undone.</p>
            </div>
            <div className="invite-modal-footer">
              <button className="btn-go-room" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                onClick={confirmDelete}>
                <Icons.Trash /> Yes, Remove
              </button>
              <button className="btn-close-modal" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- How to Connect Section ---- */}
      <div className="how-to-connect">
        <h3>🔗 How to connect with someone</h3>
        <div className="connect-steps">
          <div className="connect-step">
            <span className="connect-step-num">1</span>
            <p><strong>Share the app link</strong> with your student, teacher, or parent.</p>
          </div>
          <div className="connect-step">
            <span className="connect-step-num">2</span>
            <p><strong>They open the link</strong> in any browser on phone or computer — no install needed.</p>
          </div>
          <div className="connect-step">
            <span className="connect-step-num">3</span>
            <p><strong>They paste the room code</strong> in the "Join a Room" box above to enter your video call.</p>
          </div>
        </div>
        <p className="connect-tip">💡 <strong>Tip:</strong> Add their email as a contact first, then call them anytime with one click.</p>
      </div>
    </div>
  );
}

// ============================================
// FILES PAGE
// ============================================
// ============================================
// FILE UPLOAD HELPERS
// ============================================
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function inferCategory(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mediaExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg', 'flac', 'aac'];
  const docExts = ['doc', 'docx', 'txt', 'rtf', 'odt', 'md'];
  const templateExts = ['pptx', 'ppt', 'key', 'xlsx', 'xls', 'csv'];
  if (mediaExts.includes(ext)) return 'recordings';
  if (templateExts.includes(ext)) return 'templates';
  if (docExts.includes(ext)) return 'materials';
  if (ext === 'pdf') return 'materials';
  return 'materials'; // default
}

// ============================================
// FILES PAGE
// ============================================
function FilesPage({ user }) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uploaded_files') || '[]'); } catch { return []; }
  });
  const canUpload = user?.role === 'admin' || user?.role === 'teacher';
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('fileTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const newFile = {
        id: Date.now(),
        name: file.name,
        size: formatFileSize(file.size),
        date: new Date().toISOString().split('T')[0],
        category: inferCategory(file.name),
        dataUrl: reader.result,
        type: file.type,
        uploadedBy: user?.name || 'User',
      };
      const updated = [newFile, ...uploadedFiles];
      setUploadedFiles(updated);
      localStorage.setItem('uploaded_files', JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-uploading same file
  };

  const handleDeleteFile = (id) => {
    const updated = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updated);
    localStorage.setItem('uploaded_files', JSON.stringify(updated));
  };

  const handleDownloadFile = (file) => {
    if (file.dataUrl) {
      const a = document.createElement('a');
      a.href = file.dataUrl;
      a.download = file.name;
      a.click();
    }
  };

  const allFiles = [...uploadedFiles, ...SAMPLE_FILES];

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'materials', label: 'Materials' },
    { id: 'recordings', label: 'Recordings' },
    { id: 'templates', label: 'Templates' },
  ];

  const filteredFiles = selectedCategory === 'all' 
    ? allFiles 
    : allFiles.filter(f => f.category === selectedCategory);

  return (
    <div className="files-page">
      <div className="files-toolbar">
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`tab ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <div className="view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
              <Icons.Grid />
            </button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
              <Icons.List />
            </button>
          </div>
          {canUpload && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.csv,.pptx,.ppt,.mp4,.webm,.mov,.mp3,.wav,.ogg,.jpg,.jpeg,.png,.webp,.gif,.svg"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                  <Icons.Upload /> Upload
                </button>
                <span style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '280px' }}>
                  📄 PDF/DOCX/TXT/XLSX | 🎬 MP4/WebM | 🎵 MP3 | 🖼️ JPG/PNG ≤10MB
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="files-grid">
          {filteredFiles.map(file => (
            <div key={file.id} className={`file-card ${file.dataUrl ? 'uploaded' : ''}`}>
              <div className="file-preview">
                {file.dataUrl && file.type?.startsWith('image/') ? (
                  <img src={file.dataUrl} alt={file.name} />
                ) : (
                  <Icons.Files />
                )}
              </div>
              <div className="file-details">
                <h4>{file.name}</h4>
                <p>{file.size}</p>
                <span className="file-date">{file.date}</span>
                {file.uploadedBy && <span className="file-uploader">by {file.uploadedBy}</span>}
              </div>
              <div className="file-actions">
                {file.dataUrl ? (
                  <button className="icon-btn" title="Download" onClick={() => handleDownloadFile(file)}><Icons.Download /></button>
                ) : (
                  <button className="icon-btn" title="Download"><Icons.Download /></button>
                )}
                {file.dataUrl && canUpload && (
                  <button className="icon-btn delete" title="Delete" onClick={() => handleDeleteFile(file.id)}>
                    <Icons.Trash />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="files-empty">
              <Icons.Files />
              <p>No files in this category</p>
            </div>
          )}
        </div>
      ) : (
        <div className="files-table">
          <div className="table-header">
            <span>Name</span>
            <span>Size</span>
            <span>Date</span>
            <span>Action</span>
          </div>
          {filteredFiles.map(file => (
            <div key={file.id} className="table-row">
              <span className="file-name"><Icons.Files /> {file.name}</span>
              <span>{file.size}</span>
              <span>{file.date}</span>
              <span className="table-actions">
                {file.dataUrl ? (
                  <button className="icon-btn" title="Download" onClick={() => handleDownloadFile(file)}><Icons.Download /></button>
                ) : (
                  <button className="icon-btn" title="Download"><Icons.Download /></button>
                )}
                {file.dataUrl && canUpload && (
                  <button className="icon-btn delete" title="Delete" onClick={() => handleDeleteFile(file.id)}>
                    <Icons.Trash />
                  </button>
                )}
              </span>
            </div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="files-empty">
              <Icons.Files />
              <p>No files in this category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// REMOTE VIDEO TILE (sub-component for cleaner code)
// ============================================
function RemoteVideoTile({ peer }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
      videoRef.current.play().catch(e => console.log('Remote video play error:', e.message));
    }
  }, [peer.stream]);

  return (
    <div className="video-box">
      <div className="video-active">
        {peer.stream ? (
          <video ref={videoRef} autoPlay playsInline className="local-video" style={{ display: 'block' }} />
        ) : (
          <div className="video-off">
            <div className="avatar-large"><div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(102,126,234,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667eea', fontSize: '18px', fontWeight: 700 }}>
              {peer.userName ? peer.userName.charAt(0).toUpperCase() : '?'}
            </div></div>
          </div>
        )}
      </div>
      <div className="participant-label">
        <span className="name">{peer.userName || 'Unknown'}</span>
        {peer.role === 'Teacher' && <span className="role-badge">Teacher</span>}
      </div>
    </div>
  );
}

// ============================================
// VIDEO ROOM PAGE
// ============================================
function VideoRoomPage({ user }) {
  const { t } = useTranslation();
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(false); // Camera ON by default
  const [cameraError, setCameraError] = useState(null); // Track camera permission errors
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activePanel, setActivePanel] = useState('chat');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('zh');

  // ---- Room & WebRTC state ----
  const [roomId, setRoomId] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [userName, setUserName] = useState('You');
  const [userRole, setUserRole] = useState('Student');
  const [isInRoom, setIsInRoom] = useState(false);
  const [remotePeers, setRemotePeers] = useState([]);
  const socketRef = useRef(null);
  const peerConnsRef = useRef({});
  const myUserIdRef = useRef('user-' + Math.random().toString(36).substr(2, 9));

  // Whiteboard state
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [drawTool, setDrawTool] = useState('brush');
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Speech-to-Text state
  const [isListening, setIsListening] = useState(false);
  const [sttText, setSttText] = useState('');
  const [sttLang, setSttLang] = useState('en-US');
  const recognitionRef = useRef(null);

  // Text-to-Speech state
  const [ttsInput, setTtsInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const synthRef = useRef(window.speechSynthesis);

  const [copied, setCopied] = useState(false);

  // Contacts list in video room — cloud-synced via Supabase, localStorage as cache
  const [roomContacts, setRoomContacts] = useState(() => {
    const saved = localStorage.getItem('video_room_contacts');
    return saved ? JSON.parse(saved) : [];
  });
  const [newContactName, setNewContactName] = useState('');
  const [showContactsDropdown, setShowContactsDropdown] = useState(false);

  // Load contacts from Supabase on mount
  useEffect(() => {
    if (user?.id) {
      fetchVideoRoomContacts(user.id).then(contacts => {
        if (contacts && contacts.length > 0) {
          setRoomContacts(contacts);
          localStorage.setItem('video_room_contacts', JSON.stringify(contacts));
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  const addRoomContact = async () => {
    const name = newContactName.trim();
    if (name && !roomContacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      const newContact = { id: Date.now(), name };
      const updated = [...roomContacts, newContact];
      setRoomContacts(updated);
      localStorage.setItem('video_room_contacts', JSON.stringify(updated));
      setNewContactName('');
      // Save to Supabase in background, then update local with real ID
      if (user?.id) {
        addVideoRoomContact(user.id, name).then(result => {
          if (result) {
            setRoomContacts(prev => {
              const synced = prev.map(c => c.id === newContact.id ? { ...c, id: result.id } : c);
              localStorage.setItem('video_room_contacts', JSON.stringify(synced));
              return synced;
            });
          }
        }).catch(() => {});
      }
    }
  };

  const removeRoomContact = (id) => {
    const updated = roomContacts.filter(c => c.id !== id);
    setRoomContacts(updated);
    localStorage.setItem('video_room_contacts', JSON.stringify(updated));
    // Remove from Supabase in background
    removeVideoRoomContact(id).catch(() => {});
  };

  // ---- Calling state (three-step flow) ----
  const [callState, setCallState] = useState('idle'); // idle | confirming | outgoing | incoming | connected
  const [activeCall, setActiveCall] = useState(null); // { contactId, contactName }
  const [callMsg, setCallMsg] = useState('');
  const callTimerRef = useRef(null);

  const startCallFlow = (contact) => {
    // Step 1: confirmation dialog
    setCallState('confirming');
    setActiveCall({ contactId: contact.id, contactName: contact.name });
    setCallMsg(`Call ${contact.name}?`);
  };

  const confirmCall = () => {
    if (!activeCall) return;
    // Step 2: ringing
    setCallState('outgoing');
    setCallMsg(`Ringing ${activeCall.contactName}...`);

    // Step 3: after a delay, simulate incoming call response
    callTimerRef.current = setTimeout(() => {
      setCallState('incoming');
      setCallMsg(`Incoming call request from ${activeCall.contactName}`);
    }, 2000);
  };

  const cancelCall = () => {
    if (callTimerRef.current) clearTimeout(callTimerRef.current);
    setCallState('idle');
    setActiveCall(null);
    setCallMsg('');
  };

  const acceptCall = async () => {
    if (callTimerRef.current) clearTimeout(callTimerRef.current);
    setCallState('connected');
    setCallMsg(`Call connected with ${activeCall?.contactName}`);

    // Auto-join/create room
    const room = roomId || ('room-' + Math.random().toString(36).substr(2, 6));
    const name = userName.trim() || 'You';
    setRoomId(room);
    if (!isInRoom) {
      setMessages([{ id: Date.now(), user: 'System', text: `Call started with ${activeCall?.contactName}. Room: ${room}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      const socket = connectToSignaling(room, name, userRole);
      if (!socket) {
        setCallState('idle');
        setActiveCall(null);
        setCallMsg('');
        return;
      }
      socketRef.current = socket;
      setIsInRoom(true);
      const stream = await startStream(true, true);
      if (stream) {
        stream.getAudioTracks().forEach(track => { track.enabled = false; });
        setIsVideoOff(false);
        setIsMuted(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
    }

    // Clear call UI after connected
    setTimeout(() => {
      setCallState('idle');
      setActiveCall(null);
      setCallMsg('');
    }, 2000);
  };

  const declineCall = () => {
    if (callTimerRef.current) clearTimeout(callTimerRef.current);
    setCallState('idle');
    setActiveCall(null);
    setCallMsg('');
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearTimeout(callTimerRef.current);
    };
  }, []);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const whiteboardRef = useRef(null);

  // ---- Detect ?room= URL param, hash, and sessionStorage for incoming invites ----
  useEffect(() => {
    // 1. Check search params (?room=xxx)
    const params = new URLSearchParams(window.location.search);
    let roomParam = params.get('room');
    // 2. Check hash (#?room=xxx)
    if (!roomParam && window.location.hash) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        roomParam = hashParams.get('room');
      } catch(e) {}
    }
    // 3. Check sessionStorage (set by ContactsPage call flow)
    if (!roomParam) {
      roomParam = sessionStorage.getItem('pending_room');
    }
    if (roomParam) {
      setRoomInput(roomParam);
    }
    // Set user name from contacts call
    const callContactName = sessionStorage.getItem('pending_call_contact');
    if (callContactName) {
      setUserName(callContactName);
    }
  }, []);

  // ---- Copy invite helpers ----
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  useEffect(() => {
    return () => {
      stopCamera();
      disconnectRoom();
    };
  }, []);

  // Attach local stream to video element + add tracks to all peer connections
  useEffect(() => {
    const video = localVideoRef.current;
    const stream = localStreamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(e => console.log('Video play error:', e.message));
    }
    if (stream) {
      Object.values(peerConnsRef.current).forEach(pc => {
        stream.getTracks().forEach(track => {
          try {
            const senders = pc.getSenders();
            if (!senders.find(s => s.track && s.track.kind === track.kind)) {
              pc.addTrack(track, stream);
            }
          } catch(e) {}
        });
      });
    }
  }, [isVideoOff, isMuted, remotePeers]);

  const startStream = async (needsVideo, needsAudio) => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg = 'Camera/microphone not supported in this browser or requires HTTPS.';
        console.error(msg);
        setCameraError(msg);
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: needsVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false, 
        audio: needsAudio 
      });
      localStreamRef.current = stream;
      setCameraError(null);
      console.log('Camera stream acquired:', stream.getVideoTracks().length, 'video tracks');
      return stream;
    } catch (err) {
      console.error('Camera error:', err.name, err.message);
      const friendlyMsg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permission in your browser settings.'
        : err.name === 'NotFoundError'
        ? 'No camera found. Please connect a camera and try again.'
        : err.message || 'Unknown camera error';
      setCameraError(friendlyMsg);
      return null;
    }
  };

  // Auto-start camera on page load (before entering room)
  useEffect(() => {
    if (!isInRoom && !localStreamRef.current) {
      startStream(true, false).then(stream => {
        if (stream && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          setIsVideoOff(false);
        }
      });
    }
    return () => { stopCamera(); };
  }, []);

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
  };

  // ---- Room & WebRTC management ----
  const disconnectRoom = () => {
    Object.values(peerConnsRef.current).forEach(pc => {
      try { pc.close(); } catch(e) {}
    });
    peerConnsRef.current = {};
    setRemotePeers([]);
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const connectToSignaling = (roomIdToUse, name, role) => {
    const signaling = joinSignalingRoom(
      roomIdToUse,
      myUserIdRef.current,
      name,
      role,
      {
        onmessage: (event) => {
          let msg;
          try { msg = JSON.parse(event.data); } catch { return; }

          switch (msg.type) {
            case 'room-joined':
              msg.peers.forEach(peer => {
                if (peer.userId !== myUserIdRef.current) {
                  createPeerForUser(signaling, peer.userId, peer.userName, peer.role);
                }
              });
              break;
            case 'peer-joined':
              if (msg.userId !== myUserIdRef.current) {
                createPeerForUser(signaling, msg.userId, msg.userName, msg.role);
              }
              break;
            case 'offer':
              handleIncomingOffer(signaling, msg.fromUserId, msg.fromUserName, msg.sdp);
              break;
            case 'answer':
              handleIncomingAnswer(msg.fromUserId, msg.sdp);
              break;
            case 'ice-candidate':
              handleIncomingIce(msg.fromUserId, msg.candidate);
              break;
            case 'peer-left':
              removePeer(msg.userId);
              break;
            case 'chat-message':
              setMessages(prev => [...prev, { id: Date.now(), user: msg.fromUserName, text: msg.text, time: msg.time }]);
              break;
          }
        },
        onclose: () => { console.log('Signaling disconnected'); }
      }
    );
    return signaling;
  };

  const createPeerForUser = (socket, userId, userName, role) => {
    const pc = createPeerConnection(socket, userId);
    
    pc._onstream = (stream) => {
      setRemotePeers(prev => {
        const exists = prev.find(p => p.userId === userId);
        if (exists) return prev.map(p => p.userId === userId ? { ...p, stream, isVideoOn: true } : p);
        return [...prev, { userId, userName, role, stream, isVideoOn: true, isSpeaking: false }];
      });
    };

    pc.onstatechange = (uid, state) => {
      if (state === 'disconnected' || state === 'failed' || state === 'closed') removePeer(uid);
    };

    peerConnsRef.current[userId] = pc;
    if (localStreamRef.current) addTracksToPeer(pc, localStreamRef.current);

    setRemotePeers(prev => {
      if (prev.find(p => p.userId === userId)) return prev;
      return [...prev, { userId, userName, role, stream: null, isVideoOn: false, isSpeaking: false }];
    });

    createOffer(socket, pc, userId);
    return pc;
  };

  const handleIncomingOffer = async (socket, fromUserId, fromUserName, sdp) => {
    let pc = peerConnsRef.current[fromUserId];
    if (!pc) {
      pc = createPeerConnection(socket, fromUserId);
      peerConnsRef.current[fromUserId] = pc;
    }

    pc._onstream = (stream) => {
      setRemotePeers(prev => {
        const exists = prev.find(p => p.userId === fromUserId);
        if (exists) return prev.map(p => p.userId === fromUserId ? { ...p, stream, isVideoOn: true } : p);
        return [...prev, { userId: fromUserId, userName: fromUserName, role: 'Student', stream, isVideoOn: true, isSpeaking: false }];
      });
    };

    pc.onstatechange = (uid, state) => {
      if (state === 'disconnected' || state === 'failed' || state === 'closed') removePeer(uid);
    };

    if (localStreamRef.current) addTracksToPeer(pc, localStreamRef.current);

    setRemotePeers(prev => {
      if (prev.find(p => p.userId === fromUserId)) return prev;
      return [...prev, { userId: fromUserId, userName: fromUserName, role: 'Student', stream: null, isVideoOn: false, isSpeaking: false }];
    });

    await handleOffer(socket, pc, fromUserId, sdp);
  };

  const handleIncomingAnswer = async (fromUserId, sdp) => {
    const pc = peerConnsRef.current[fromUserId];
    if (pc) await handleAnswer(pc, sdp);
  };

  const handleIncomingIce = async (fromUserId, candidate) => {
    const pc = peerConnsRef.current[fromUserId];
    if (pc) await handleIceCandidate(pc, candidate);
  };

  const removePeer = (userId) => {
    const pc = peerConnsRef.current[userId];
    if (pc) { try { pc.close(); } catch(e) {}; delete peerConnsRef.current[userId]; }
    setRemotePeers(prev => prev.filter(p => p.userId !== userId));
  };

  const joinRoom = async () => {
    const room = roomInput.trim() || ('room-' + Math.random().toString(36).substr(2, 6));
    const name = userName.trim() || 'You';
    setRoomId(room);
    setMessages([{ id: Date.now(), user: 'System', text: `Joining room: ${room}`, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }]);
    const socket = connectToSignaling(room, name, userRole);
    if (!socket) return;
    socketRef.current = socket;
    setIsInRoom(true);
    const stream = await startStream(true, true);
    if (stream) {
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      setIsVideoOff(false);
      setIsMuted(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }
  };

  const createRoom = async () => {
    const room = 'room-' + Math.random().toString(36).substr(2, 6);
    setRoomId(room);
    setUserRole('Teacher');
    const name = 'Teacher';
    setUserName(name);
    setMessages([{ id: Date.now(), user: 'System', text: `Room created: ${room} — share this code with students!`, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }]);
    const socket = connectToSignaling(room, name, 'Teacher');
    if (!socket) return;
    socketRef.current = socket;
    setIsInRoom(true);
    const stream = await startStream(true, true);
    if (stream) {
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      setIsVideoOff(false);
      setIsMuted(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }
  };

  const leaveRoom = () => {
    stopCamera();
    disconnectRoom();
    setIsInRoom(false);
    setIsVideoOff(true);
    setIsMuted(true);
  };

  const toggleCamera = async () => {
    // If no stream yet (camera was off before room join), try to acquire one
    if (!localStreamRef.current) {
      const stream = await startStream(true, !!localStreamRef.current?.getAudioTracks()?.[0]);
      if (stream) {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setIsVideoOff(false);
      }
      return;
    }
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    } else {
      // Had audio-only stream, restart with video
      const stream = await startStream(true, !isMuted);
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        setIsVideoOff(false);
      }
    }
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(!audioTrack.enabled); }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

        // Propagate screen video track to all connected peers
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        Object.values(peerConnsRef.current).forEach(pc => {
          replaceVideoTrack(pc, screenVideoTrack);
        });

        // Auto-stop when user clicks browser's "Stop sharing" button
        screenVideoTrack.onended = () => {
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
          }
          if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          setIsScreenSharing(false);
          // Restore camera track on all peers
          const cameraTrack = localStreamRef.current?.getVideoTracks()?.[0] || null;
          Object.values(peerConnsRef.current).forEach(pc => {
            replaceVideoTrack(pc, cameraTrack);
          });
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.log('Screen share cancelled');
      }
    } else {
      // Stop screen sharing, restore camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;

      // Restore camera track on all peers
      const cameraTrack = localStreamRef.current?.getVideoTracks()?.[0] || null;
      Object.values(peerConnsRef.current).forEach(pc => {
        replaceVideoTrack(pc, cameraTrack);
      });

      setIsScreenSharing(false);
    }
  };

  // ---- Speech-to-Text ----
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('sttNotSupported'));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = sttLang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSttText(transcript);
    };
    recognition.onerror = (event) => {
      console.error('STT Error:', event.error);
      if (event.error === 'no-speech') return;
      setIsListening(false);
    };
    recognition.onend = () => { setIsListening(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const copySttText = () => {
    if (sttText) {
      navigator.clipboard.writeText(sttText);
    }
  };

  const sendSttToChat = () => {
    if (sttText.trim()) {
      setMessages([...messages, { id: Date.now(), user: 'You (voice)', text: sttText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setSttText('');
    }
  };

  // ---- Text-to-Speech ----
  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        if (!ttsVoice) setTtsVoice(voices[0].name);
      }
    };
    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
    return () => { synthRef.current.onvoiceschanged = null; };
  }, []);

  const speakText = () => {
    if (!ttsInput.trim() || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(ttsInput);
    if (ttsVoice) {
      const voice = availableVoices.find(v => v.name === ttsVoice);
      if (voice) utterance.voice = voice;
    }
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  };


  const sendMessage = () => {
    if (chatMessage.trim()) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = { id: Date.now(), user: 'You', text: chatMessage, time };
      setMessages(prev => [...prev, msg]);
      // Broadcast to room via signaling
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'chat-message', text: chatMessage, time }));
      }
      setChatMessage('');
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: 'Chinese' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'ar', name: 'Arabic' },
    { code: 'pt', name: 'Portuguese' },
  ];

  const transcriptLines = [
    { time: '09:00', speaker: 'Teacher', text: 'Good morning everyone. Today we will be discussing advanced grammar structures.' },
    { time: '09:02', speaker: 'Teacher', text: 'Let\'s start with conditional sentences and their various forms.' },
    { time: '09:05', speaker: 'Teacher', text: 'Pay attention to the difference between zero, first, second, and third conditionals.' },
  ];

  // Whiteboard functions
  const initWhiteboard = () => {
    const canvas = whiteboardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (showWhiteboard && whiteboardRef.current) {
      const canvas = whiteboardRef.current;
      const wrapper = canvas.parentElement;
      if (!wrapper) return;
      const resizeCanvas = () => {
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width || 800;
        canvas.height = Math.max((rect.height || 600) - 80, 200);
        initWhiteboard();
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [showWhiteboard]);

  const getCanvasCoords = (e) => {
    const canvas = whiteboardRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setLastPos(coords);
    const ctx = whiteboardRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = drawTool === 'eraser' ? '#0f0f1a' : drawColor;
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const ctx = whiteboardRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = drawTool === 'eraser' ? '#0f0f1a' : drawColor;
    ctx.lineWidth = drawTool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setLastPos(coords);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    if (whiteboardRef.current) {
      const ctx = whiteboardRef.current.getContext('2d');
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, whiteboardRef.current.width, whiteboardRef.current.height);
    }
  };

  // ---- Room Lobby (not yet in a room) ----
  if (!isInRoom) {
    const hasInviteCode = roomInput.length > 3;
    return (
      <div className="video-room">
        <div className="video-lobby">
          <div className="video-lobby-card">
            {/* Header */}
            <div className="video-lobby-header">
              <span className="video-lobby-icon">
                <Icons.Video />
              </span>
              <h2>Video Classroom</h2>
              <p>Create a room or join with a code from your teacher</p>
            </div>

            {/* Invite Code Banner — shown when code is detected */}
            {hasInviteCode && (
              <div className="video-lobby-invite">
                <span className="video-lobby-invite-icon"><Icons.Link /></span>
                <div className="video-lobby-invite-info">
                  <p className="video-lobby-invite-title">You've been invited to join a room!</p>
                  <p className="video-lobby-invite-room">
                    Room code: <strong>{roomInput}</strong>
                  </p>
                </div>
                <button className="btn-lobby-join-green" onClick={joinRoom}>
                  <Icons.Video /> Join Now
                </button>
                <p className="video-lobby-not-you">
                  Not your room? Enter a different code below.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="video-lobby-actions">
              <button className="btn-lobby-create" onClick={createRoom}>
                <span className="btn-lobby-icon">🎓</span>
                <span className="btn-lobby-label">
                  <strong>Create Classroom</strong>
                  <small>Start teaching — share the code with students</small>
                </span>
              </button>

              <div className="video-lobby-divider">
                <span>or</span>
              </div>

              {/* Join with code */}
              <div className="video-lobby-join">
                <label className="video-lobby-label">Your Name</label>
                <input
                  type="text"
                  className="video-lobby-input"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                />
                <label className="video-lobby-label">Room Code</label>
                <input
                  type="text"
                  className="video-lobby-input"
                  placeholder="Paste the room code here (e.g. room-abc123)"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && joinRoom()}
                />
                <button className="btn-lobby-join-room" onClick={joinRoom}>
                  <Icons.Video /> Join Classroom
                </button>
              </div>
            </div>

            {/* Help tip */}
            <div className="video-lobby-tip">
              <span className="video-lobby-tip-icon">💡</span>
              <p>
                <strong>How to get a room code?</strong> Ask your teacher or host to create a room 
                and share the code with you. Then paste it above.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalPeople = 1 + remotePeers.length;

  return (
    <div className="video-room">
      <div className="video-area">
        <div className="room-header">
          <div className="room-info">
            <h3>Room: {roomId}</h3>
            <span className="live-indicator"><span className="pulse"></span> LIVE</span>
            <div className="invite-btns">
              <button className="invite-btn" onClick={copyRoomCode} title="Copy room code to clipboard">
                <Icons.Copy /> {copied ? 'Copied!' : 'Code'}
              </button>
              <button className="invite-btn primary" onClick={copyInviteLink} title="Copy invite link to share with students">
                <Icons.Link /> {copied ? 'Copied!' : 'Invite'}
              </button>
            </div>
          </div>
          <div className="participant-count">
            <Icons.People /> {totalPeople} participants
          </div>
        </div>

        {showWhiteboard ? (
          <div className="whiteboard-wrapper">
            <canvas
              ref={whiteboardRef}
              className="whiteboard-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="whiteboard-toolbar">
              <button className={`wb-tool ${drawTool === 'brush' ? 'active' : ''}`} onClick={() => setDrawTool('brush')} title="Brush">
                <Icons.Brush />
                <span>Brush</span>
              </button>
              <button className={`wb-tool ${drawTool === 'eraser' ? 'active' : ''}`} onClick={() => setDrawTool('eraser')} title="Eraser">
                <Icons.Eraser />
                <span>Eraser</span>
              </button>
              <div className="wb-divider" />
              <div className="wb-color-section">
                <label>Color</label>
                <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="wb-color-picker" />
              </div>
              <div className="wb-divider" />
              <div className="wb-brush-section">
                <label>Size: {brushSize}px</label>
                <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
              </div>
              <div className="wb-divider" />
              <button className="wb-clear-btn" onClick={clearWhiteboard} title="Clear entire whiteboard">
                <Icons.Clear />
                <span>Clear All</span>
              </button>
            </div>
            <div className="whiteboard-indicator">
              <Icons.Whiteboard /> Whiteboard Active
            </div>
          </div>
        ) : (
          <div className={`video-grid ${remotePeers.length > 0 ? 'has-remotes' : ''}`}>
            {/* Remote peer tiles — fill main area */}
            {remotePeers.map(peer => (
              <RemoteVideoTile key={peer.userId} peer={peer} />
            ))}
            {/* Local tile — full-size when alone, PIP when others present */}
            <div className={`video-box local-box ${remotePeers.length > 0 ? 'pip' : ''}`}>
              <div className="video-active">
                <video 
                  ref={localVideoRef} 
                  autoPlay muted playsInline 
                  className="local-video"
                  style={{ display: (!isVideoOff && localStreamRef.current) ? 'block' : 'none' }}
                />
                {(isVideoOff || !localStreamRef.current) && (
                  <div className="video-off">
                    <div className="avatar-large"><Icons.User /></div>
                    {cameraError && <p style={{color:'#f87171',fontSize:'11px',marginTop:'8px',textAlign:'center'}}>{cameraError}</p>}
                  </div>
                )}
              </div>
              <div className="participant-label">
                <span className="name">{userName} (You)</span>
                {userRole === 'Teacher' && <span className="role-badge">Teacher</span>}
              </div>
            </div>
            {/* Empty slot when alone */}
            {remotePeers.length === 0 && (
              <div className="video-box">
                <div className="video-off" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>
                    {userRole === 'Teacher' ? 'Waiting for students to join...' : 'Waiting for teacher...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Camera Error Banner ---- */}
        {cameraError && (
          <div className="camera-error-banner">
            <span>{cameraError}</span>
            <button onClick={() => { setCameraError(null); toggleCamera(); }}>Retry Camera</button>
          </div>
        )}

        {/* ---- Floating Contacts Dropdown (small button, right side) ---- */}
        <div className="contacts-float">
          <button
            className={`contacts-float-btn ${showContactsDropdown ? 'active' : ''}`}
            onClick={() => setShowContactsDropdown(!showContactsDropdown)}
            title="Contacts"
          >
            <Icons.Contacts />
            {roomContacts.length > 0 && <span className="contacts-float-badge">{roomContacts.length}</span>}
          </button>
          {showContactsDropdown && (
            <div className="contacts-dropdown">
              <div className="contacts-dropdown-head">
                <span>Contacts</span>
                <button onClick={() => setShowContactsDropdown(false)}>&times;</button>
              </div>
              <div className="contacts-dropdown-add">
                <input
                  type="text"
                  placeholder="Add name..."
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRoomContact()}
                />
                <button onClick={addRoomContact} title="Add">+</button>
              </div>
              <div className="contacts-dropdown-list">
                {roomContacts.length === 0 ? (
                  <p className="contacts-dropdown-empty">No contacts yet</p>
                ) : (
                  roomContacts.map(contact => (
                    <div key={contact.id} className="contacts-dropdown-item">
                      <div className="contacts-dropdown-avatar">{contact.name.charAt(0).toUpperCase()}</div>
                      <span className="contacts-dropdown-name">{contact.name}</span>
                      <div className="contacts-dropdown-actions">
                        <button className="contacts-dropdown-call" onClick={() => startCallFlow(contact)} title={`Call ${contact.name}`}>
                          <Icons.PhoneCall />
                        </button>
                        <button className="contacts-dropdown-del" onClick={() => removeRoomContact(contact.id)} title="Remove">&times;</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="video-controls">
          <div className="controls-main">
            <button className={`ctrl-btn mic ${isMuted ? 'off' : ''}`} onClick={toggleMic} title={isMuted ? 'Unmute microphone' : 'Mute microphone'}>
              <div className="ctrl-icon">{isMuted ? <Icons.MicOff /> : <Icons.Mic />}</div>
              <span className="ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button className={`ctrl-btn camera ${isVideoOff ? 'off' : ''}`} onClick={toggleCamera} title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}>
              <div className="ctrl-icon">{isVideoOff ? <Icons.CameraOff /> : <Icons.Camera />}</div>
              <span className="ctrl-label">{isVideoOff ? 'Start' : 'Stop'}</span>
            </button>
            <button className={`ctrl-btn screen ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare} title="Share your screen">
              <div className="ctrl-icon"><Icons.Screen /></div>
              <span className="ctrl-label">{isScreenSharing ? 'Stop' : 'Share'}</span>
            </button>
            <button className={`ctrl-btn whiteboard ${showWhiteboard ? 'active' : ''}`} onClick={() => setShowWhiteboard(!showWhiteboard)} title="Open whiteboard">
              <div className="ctrl-icon"><Icons.Whiteboard /></div>
              <span className="ctrl-label">Board</span>
            </button>
          </div>
          <button className="ctrl-btn leave" onClick={leaveRoom} title="Leave call">
            <div className="ctrl-icon"><Icons.Phone /></div>
            <span className="ctrl-label">Leave</span>
          </button>
        </div>
      </div>

      <div className="sidebar-panel">
        <div className="panel-tabs">
          <button className={`tab ${activePanel === 'chat' ? 'active' : ''}`} onClick={() => setActivePanel('chat')}>
            <Icons.Mail /> Chat
          </button>
          <button className={`tab ${activePanel === 'transcript' ? 'active' : ''}`} onClick={() => setActivePanel('transcript')}>
            <Icons.Translate /> Transcript
          </button>
          <button className={`tab ${activePanel === 'speech' ? 'active' : ''}`} onClick={() => setActivePanel('speech')}>
            <Icons.Microphone /> Speech
          </button>
          <button className={`tab ${activePanel === 'contacts' ? 'active' : ''}`} onClick={() => setActivePanel('contacts')}>
            <Icons.Contacts /> Contacts
          </button>
          <button className={`tab ${activePanel === 'people' ? 'active' : ''}`} onClick={() => setActivePanel('people')}>
            <Icons.People /> People <span className="tab-badge">{totalPeople}</span>
          </button>
        </div>

        {activePanel === 'chat' && (
          <>
            <div className="chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.user === 'You' || msg.user === 'You (voice)' ? 'outgoing' : ''}`}>
                  <div className="message-header">
                    <span className="message-user">{msg.user}</span>
                    <span className="message-time">{msg.time}</span>
                  </div>
                  <p className="message-text">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder={t('typeMessage')}
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}><Icons.Send /></button>
            </div>
          </>
        )}

        {activePanel === 'transcript' && (
          <div className="transcript-panel">
            <div className="translation-selector">
              <div className="lang-select-row">
                <span className="lang-select-label">{t('fromLanguage')}</span>
                <select value={sourceLang} onChange={e => setSourceLang(e.target.value)}>
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <span className="lang-arrow-divider">→</span>
              <div className="lang-select-row">
                <span className="lang-select-label">{t('toLanguage')}</span>
                <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="transcript-content">
              {transcriptLines.map((line, i) => (
                <div key={i} className="transcript-line">
                  <span className="transcript-time">{line.time}</span>
                  <div className="transcript-text">
                    <span className="speaker">{line.speaker}:</span>
                    <p>{line.text}</p>
                    <span className="translation">
                      {t('translationLabel')}: {line.text}
                    </span>
                    <span className="translation-langs">
                      {languages.find(l => l.code === sourceLang)?.name} → {languages.find(l => l.code === targetLang)?.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'speech' && (
          <div className="speech-panel">
            {/* ---- Speech to Text ---- */}
            <div className="speech-section">
              <div className="speech-section-header">
                <Icons.Microphone />
                <h4>{t('speechToText')}</h4>
              </div>
              <div className="speech-stt-body">
                <div className="stt-controls">
                  <select value={sttLang} onChange={e => setSttLang(e.target.value)} className="stt-lang-select">
                    <option value="en-US">English</option>
                    <option value="zh-CN">中文 (Chinese)</option>
                    <option value="es-ES">Español</option>
                    <option value="fr-FR">Français</option>
                    <option value="ar-SA">العربية</option>
                  </select>
                  <button
                    className={`stt-mic-btn ${isListening ? 'listening' : ''}`}
                    onClick={isListening ? stopListening : startListening}
                    title={isListening ? t('stopRecording') : t('startRecording')}
                  >
                    <Icons.Microphone />
                  </button>
                  {isListening && <span className="stt-recording-label">{t('listening')}</span>}
                </div>
                <div className="stt-text-area">
                  {isListening && !sttText && (
                    <div className="stt-listening-animation">
                      <span className="wave-bar"></span><span className="wave-bar"></span><span className="wave-bar"></span><span className="wave-bar"></span><span className="wave-bar"></span>
                    </div>
                  )}
                  <p className={sttText ? 'stt-result' : 'stt-placeholder'}>
                    {sttText || t('sttPlaceholder')}
                  </p>
                </div>
                {sttText && (
                  <div className="stt-actions">
                    <button className="speech-action-btn" onClick={copySttText} title={t('copyText')}>
                      <Icons.Copy /> {t('copyText')}
                    </button>
                    <button className="speech-action-btn primary" onClick={sendSttToChat} title={t('sendToChat')}>
                      <Icons.Send /> {t('sendToChat')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ---- Text to Speech ---- */}
            <div className="speech-section">
              <div className="speech-section-header">
                <Icons.Speaker />
                <h4>{t('textToSpeech')}</h4>
              </div>
              <div className="speech-tts-body">
                <textarea
                  className="tts-textarea"
                  placeholder={t('ttsPlaceholder')}
                  value={ttsInput}
                  onChange={e => setTtsInput(e.target.value)}
                  rows={4}
                />
                <div className="tts-controls">
                  <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)} className="tts-voice-select">
                    {availableVoices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                  <button
                    className={`tts-play-btn ${isSpeaking ? 'speaking' : ''}`}
                    onClick={isSpeaking ? stopSpeaking : speakText}
                    disabled={!ttsInput.trim()}
                    title={isSpeaking ? t('stopSpeaking') : t('playTts')}
                  >
                    {isSpeaking ? <Icons.StopBtn /> : <Icons.Speaker />}
                    <span>{isSpeaking ? t('stopSpeaking') : t('playTts')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'contacts' && (
          <div className="room-contacts-panel">
            <div className="room-contacts-add">
              <input
                type="text"
                placeholder="Add contact name..."
                value={newContactName}
                onChange={e => setNewContactName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRoomContact()}
              />
              <button onClick={addRoomContact} title="Add contact">
                <Icons.PlusCircle />
              </button>
            </div>
            <div className="room-contacts-list">
              {roomContacts.length === 0 ? (
                <div className="room-contacts-empty">
                  <Icons.Contacts />
                  <p>No contacts yet</p>
                  <span>Add people you want to reach during this session</span>
                </div>
              ) : (
                roomContacts.map(contact => (
                  <div key={contact.id} className="room-contact-item">
                    <div className="room-contact-avatar">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="room-contact-name">{contact.name}</span>
                    <button
                      className="room-contact-call"
                      onClick={() => startCallFlow(contact)}
                      title={`Call ${contact.name}`}
                    >
                      <Icons.PhoneCall />
                    </button>
                    <button
                      className="room-contact-remove"
                      onClick={() => removeRoomContact(contact.id)}
                      title="Remove contact"
                    >
                      <Icons.MinusCircle />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---- Call Overlay / Modal ---- */}
      {callState !== 'idle' && (
        <div className="call-overlay" onClick={cancelCall}>
          <div className={`call-modal ${callState}`} onClick={e => e.stopPropagation()}>
            {/* Decorative ring animation */}
            <div className="call-ring">
              <div className="call-ring-dot">
                {activeCall?.contactName?.charAt(0).toUpperCase()}
              </div>
              <span className="call-ring-pulse"></span>
              <span className="call-ring-pulse delay"></span>
            </div>

            <h3 className="call-modal-name">{activeCall?.contactName}</h3>
            <p className="call-modal-msg">{callMsg}</p>

            {/* Step 1: Confirmation */}
            {callState === 'confirming' && (
              <div className="call-actions">
                <button className="call-btn call" onClick={confirmCall}>
                  <Icons.PhoneCall /> Call Now
                </button>
                <button className="call-btn cancel" onClick={cancelCall}>
                  <Icons.X /> Cancel
                </button>
              </div>
            )}

            {/* Step 2: Outgoing ringing */}
            {callState === 'outgoing' && (
              <div className="call-actions">
                <div className="call-status-ringing">
                  <span className="ringing-dot"></span>
                  <span className="ringing-dot"></span>
                  <span className="ringing-dot"></span>
                </div>
                <button className="call-btn cancel" onClick={cancelCall}>
                  <Icons.Phone /> Hang Up
                </button>
              </div>
            )}

            {/* Step 3: Incoming call - Accept/Decline */}
            {callState === 'incoming' && (
              <div className="call-actions">
                <button className="call-btn accept" onClick={acceptCall}>
                  <Icons.PhoneCall /> Accept
                </button>
                <button className="call-btn decline" onClick={declineCall}>
                  <Icons.Phone /> Decline
                </button>
              </div>
            )}

            {/* Step 4: Connected */}
            {callState === 'connected' && (
              <div className="call-actions">
                <div className="call-connected-check">
                  <Icons.Check />
                </div>
                <span className="call-connected-text">Call Connected!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- People / Group Call Panel ---- */}
      {activePanel === 'people' && (
        <div className="people-panel">
          <div className="people-header">
            <h4>People in this room</h4>
            <span className="people-count">{totalPeople} participants</span>
          </div>
          <div className="people-list">
            {/* Self */}
            <div className="people-item self">
              <div className="people-avatar" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="people-info">
                <span className="people-name">{userName} (You)</span>
                <span className="people-role">{userRole}</span>
              </div>
              <span className="people-status">
                <span className="status-dot online"></span>
                Host
              </span>
            </div>
            {/* Remote peers */}
            {remotePeers.map(peer => (
              <div key={peer.userId} className="people-item">
                <div className="people-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {(peer.userName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="people-info">
                  <span className="people-name">{peer.userName || 'Unknown'}</span>
                  <span className="people-role">{peer.role || 'Student'}</span>
                </div>
                <span className="people-status">
                  <span className={`status-dot ${peer.stream ? 'online' : 'connecting'}`}></span>
                  {peer.stream ? 'Connected' : 'Connecting…'}
                </span>
              </div>
            ))}
            {remotePeers.length === 0 && (
              <div className="people-empty">
                <Icons.People />
                <p>No one else here yet</p>
                <span>Share the room code to invite others</span>
              </div>
            )}
          </div>
          {/* Group Call Tip */}
          <div className="people-group-tip">
            <span className="people-tip-icon">👥</span>
            <div>
              <strong>Group Call</strong>
              <p>Share the room code <code>{roomId}</code> with multiple people — they can all join the same room for a group video call.</p>
              <button className="btn-people-invite" onClick={copyInviteLink}>
                <Icons.Link /> Copy Invite Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// INTEGRATED LOGIN SCREEN (shares dashboard layout)
// ============================================
function LoginContent({ onLogin }) {
  const { t } = useTranslation();
  const [loginRole, setLoginRole] = useState(null);
  const [adminSubRole, setAdminSubRole] = useState(null);

  const goBack = () => {
    if (adminSubRole) setAdminSubRole(null);
    else setLoginRole(null);
  };

  // Teacher login
  const handleTeacherLogin = async (identifier, password) => {
    const teachers = getStoredTeachers();
    const matched = teachers.find(t =>
      t.email.toLowerCase() === identifier.toLowerCase() &&
      t.password === password &&
      t.status !== 'inactive'
    );
    if (matched) {
      onLogin({ name: matched.name, email: matched.email, role: 'teacher', id: matched.id, phone: matched.phone || '', subject: matched.subject });
      return true;
    }
    try {
      const result = await signInLocal(identifier, password);
      if (result.profile && result.profile.role === 'teacher') {
        result.profile.phone = result.profile.phone || '';
        onLogin(result.profile);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const handleAdminLogin = () => {
    onLogin({ name: 'Administrator', email: ADMIN_EMAIL, role: 'admin', id: 0, phone: '' });
  };

  const handleFamilyLogin = (userData) => {
    onLogin(userData);
  };

  if (!loginRole) {
    return (
      <div className="login-content">
        <div className="login-card">
          <div className="login-card-header">
            <h2>{t('welcomeBack') || 'Welcome Back'}</h2>
            <p>{t('signInDesc') || 'Sign in to your account'}</p>
          </div>
          <div className="login-role-choices">
            <button className="login-role-btn admin-btn" onClick={() => setLoginRole('administrator')}>
              <span className="lr-icon">🛡️</span>
              <div className="lr-text">
                <span className="lr-title">Administrator</span>
                <span className="lr-desc">Admin & Teacher access</span>
              </div>
            </button>
            <button className="login-role-btn family-btn" onClick={() => setLoginRole('family')}>
              <span className="lr-icon">🏠</span>
              <div className="lr-text">
                <span className="lr-title">Family</span>
                <span className="lr-desc">View your family calendar & progress</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin sub-role choice
  if (loginRole === 'administrator' && !adminSubRole) {
    return (
      <div className="login-content">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Administrator Access</h2>
          </div>
          <div className="login-role-choices">
            <button className="login-role-btn admin-btn" onClick={() => setAdminSubRole('admin')}>
              <span className="lr-icon">🛡️</span>
              <div className="lr-text">
                <span className="lr-title">Admin</span>
                <span className="lr-desc">Full system access</span>
              </div>
            </button>
            <button className="login-role-btn teacher-btn" onClick={() => setAdminSubRole('teacher')}>
              <span className="lr-icon">👩‍🏫</span>
              <div className="lr-text">
                <span className="lr-title">Teacher</span>
                <span className="lr-desc">Students, calendar, video calls</span>
              </div>
            </button>
          </div>
          <button className="login-back-btn" onClick={goBack}>← Back</button>
        </div>
      </div>
    );
  }

  // Admin login form
  if (loginRole === 'administrator' && adminSubRole === 'admin') {
    return (
      <div className="login-content">
        <div className="login-card">
          <LoginForm t={t} role="admin" onSuccess={handleAdminLogin} onBack={goBack} />
        </div>
      </div>
    );
  }

  // Teacher login form
  if (loginRole === 'administrator' && adminSubRole === 'teacher') {
    return (
      <div className="login-content">
        <div className="login-card">
          <LoginForm t={t} role="teacher" onSuccess={handleTeacherLogin} onBack={goBack} />
        </div>
      </div>
    );
  }

  // Family login form
  if (loginRole === 'family') {
    return (
      <div className="login-content">
        <div className="login-card">
          <LoginForm t={t} role="family" onSuccess={handleFamilyLogin} onBack={goBack} />
        </div>
      </div>
    );
  }

  return null;
}

// ============================================
// MAIN APP
// ============================================
function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Try Supabase session first, then fallback to localStorage
    getSession().then(async ({ profile }) => {
      if (profile) {
        let profileData = { ...profile, id: profile.id, role: profile.role };
        if (profile.role === 'parent' && !profile.parent_id && profile.email) {
          try {
            const students = await fetchStudents();
            let matched = students.find(s =>
              s.parent_email && s.parent_email.toLowerCase() === profile.email.toLowerCase()
            );
            if (!matched) {
              // Also check local persisted students
              const allLocal = getAllStudents();
              matched = allLocal.find(s =>
                s.parentEmail && s.parentEmail.toLowerCase() === profile.email.toLowerCase()
              );
              if (matched) profileData.parentId = matched.parentId;
            } else {
              profileData.parentId = matched.parent_id;
            }
          } catch (_) {}
        }
        setUser(profileData);
      } else {
        // Fallback: localStorage
        const saved = localStorage.getItem('classroom_user');
        if (saved) {
          let parsed = JSON.parse(saved);
          if (parsed.role === 'parent' && !parsed.parentId && parsed.email) {
            const allStudents = getAllStudents();
            const matched = allStudents.find(s =>
              s.parentEmail && s.parentEmail.toLowerCase() === parsed.email.toLowerCase()
            );
            if (matched) {
              parsed = { ...parsed, parentId: matched.parentId };
              localStorage.setItem('classroom_user', JSON.stringify(parsed));
            }
          }
          setUser(parsed);
        }
        // No auto-login: user must click login button
      }
      setAuthReady(true);
    }).catch(() => {
      // Fallback to localStorage
      const saved = localStorage.getItem('classroom_user');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (parsed.role === 'parent' && !parsed.parentId && parsed.email) {
          const allStudents = getAllStudents();
          const matched = allStudents.find(s =>
            s.parentEmail && s.parentEmail.toLowerCase() === parsed.email.toLowerCase()
          );
          if (matched) {
            parsed = { ...parsed, parentId: matched.parentId };
            localStorage.setItem('classroom_user', JSON.stringify(parsed));
          }
        }
        setUser(parsed);
      }
      // No auto-login: user must click login button
      setAuthReady(true);
    });
  }, []);

  const handleLogin = (userData) => {
    let data = typeof userData === 'string'
      ? { name: userData === 'teacher' ? 'Teacher' : 'Student', email: 'user@example.com', role: userData, id: Date.now() }
      : { ...userData, id: userData.id || Date.now() };
    // If parent, match email to find correct parentId so they only see their children
    if (data.role === 'parent') {
      const allStudents = getAllStudents();
      const parentEmail = (data.email || '').toLowerCase();
      let matched = allStudents.find(s =>
        s.parentEmail && s.parentEmail.toLowerCase() === parentEmail
      );
      if (matched) {
        data.parentId = matched.parentId;
      }
      // If still no match, check the parent-student map (newly registered students)
      if (!data.parentId && parentEmail) {
        try {
          const parentMap = JSON.parse(localStorage.getItem('linguaclass_student_parent_map') || '{}');
          const mappedData = parentMap[parentEmail];
          if (mappedData && mappedData.parentId) {
            data.parentId = mappedData.parentId;
          }
        } catch (_) {}
      }
      // If still no match, try matching by parent name
      if (!data.parentId) {
        const matchedByName = allStudents.find(s =>
          s.parentName && s.parentName.toLowerCase() === (data.name || '').toLowerCase()
        );
        if (matchedByName) {
          data.parentId = matchedByName.parentId;
        }
        // Also check the parent map by name
        if (!data.parentId && (data.name || '').toLowerCase()) {
          try {
            const parentMap = JSON.parse(localStorage.getItem('linguaclass_student_parent_map') || '{}');
            const searchName = (data.name || '').toLowerCase();
            for (const [, mapData] of Object.entries(parentMap)) {
              if (mapData.parentName && mapData.parentName.toLowerCase() === searchName) {
                data.parentId = mapData.parentId;
                break;
              }
            }
          } catch (_) {}
        }
      }
    }
    setUser(data);
    localStorage.setItem('classroom_user', JSON.stringify(data));
  };

  const handleLogout = async () => {
    setUser(null);
    localStorage.removeItem('classroom_user');
    try { await signOut(); } catch (_) {}
  };

  if (!authReady) {
    return <div className="auth-loading"><div className="loading-spinner" /><p>Loading...</p></div>;
  }

  // ========== ENFORCE ROLE-BASED PAGE ACCESS ==========
  const renderPage = () => {
    // Guests see the dashboard with login embedded
    if (!user) {
      return <DashboardPage user={null} setCurrentPage={setCurrentPage} />;
    }

    const isFamily = user?.role === 'parent' || user?.role === 'student';
    const isTeacher = user?.role === 'teacher';
    const isAdmin = user?.role === 'admin';

    // Family users ONLY: dashboard, calendar, files
    if (isFamily && !['dashboard', 'calendar', 'files'].includes(currentPage)) {
      if (setCurrentPage) setCurrentPage('dashboard');
      return <DashboardPage user={user} setCurrentPage={setCurrentPage} />;
    }

    // Only admin and teacher can access administration page
    if (currentPage === 'admin' && !isAdmin && !isTeacher) {
      if (setCurrentPage) setCurrentPage('dashboard');
      return <DashboardPage user={user} setCurrentPage={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'dashboard': return <DashboardPage user={user} setCurrentPage={setCurrentPage} />;
      case 'calendar': return <CalendarPage user={user} />;
      case 'files': return <FilesPage user={user} />;
      case 'studentrecords': return <StudentRecordsPage user={user} />;
      case 'contacts': setCurrentPage('video'); return <VideoRoomPage user={user} />;
      case 'admin': return <AdministrationPage user={user} />;
      case 'video': return <VideoRoomPage user={user} />;
      default: return <DashboardPage user={user} setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <LanguageProvider>
      <AppLayout user={user} onLogout={handleLogout} onLogin={handleLogin} currentPage={currentPage} setCurrentPage={setCurrentPage}>
        {renderPage()}
      </AppLayout>
    </LanguageProvider>
  );
}

export default App;
