import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// ============================================
// AUTH HELPERS
// ============================================

// Detect if a string is an email or phone number
function isEmail(identifier) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

// Generate a stable virtual email from a phone number
function phoneToVirtualEmail(phone) {
  // Clean phone: keep only digits and a leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Simple hash for stability
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = ((hash << 5) - hash) + cleaned.charCodeAt(i);
    hash |= 0;
  }
  return `phone_${Math.abs(hash)}@linguaclass.internal`;
}

export async function signUp(name, email, password, phone, role) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone, role },
    },
  });
  if (error) throw error;

  // Create profile record
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name,
      email,
      phone,
      role,
      avatar: role === 'teacher' ? '👩‍🏫' : role === 'admin' ? '🛡️' : '👤',
    }, { onConflict: 'id' });
  }
  return data;
}

/**
 * Sign up with either email or phone number.
 * If phone is used, we create a virtual email internally for Supabase auth.
 */
export async function signUpWithEmailOrPhone(identifier, password, name, role) {
  if (isEmail(identifier)) {
    // Email-based signup
    return signUp(name, identifier, password, '', role);
  } else {
    // Phone-based signup — use virtual email
    const virtualEmail = phoneToVirtualEmail(identifier);
    const { data, error } = await supabase.auth.signUp({
      email: virtualEmail,
      password,
      options: {
        data: { name, phone: identifier, role },
      },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        email: virtualEmail,
        phone: identifier,
        role,
        avatar: role === 'teacher' ? '👩‍🏫' : role === 'admin' ? '🛡️' : '👤',
      }, { onConflict: 'id' });
    }
    return { ...data, usedPhone: true, phone: identifier };
  }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Get profile
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      user: data.user,
      profile,
    };
  }
  return data;
}

/**
 * Sign in with either email or phone number.
 * If phone, looks up the virtual email first, then signs in.
 */
export async function signInWithEmailOrPhone(identifier, password) {
  if (isEmail(identifier)) {
    return signIn(identifier, password);
  } else {
    // Phone-based login — find user by phone in profiles
    const { data: profiles, error: lookupError } = await supabase
      .from('profiles')
      .select('email')
      .eq('phone', identifier);

    if (lookupError || !profiles || profiles.length === 0) {
      throw new Error('No account found with this phone number.');
    }

    // Use the first matching profile's email to sign in
    const virtualEmail = profiles[0].email;
    return signIn(virtualEmail, password);
  }
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .single();
    return { session: data.session, profile };
  }
  return { session: null, profile: null };
}

// ============================================
// DATA HELPERS (snake_case → camelCase mapping)
// ============================================

// Map DB rows to camelCase for frontend compatibility
function mapTeacher(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    phone: row.phone,
    avatar: row.avatar,
    status: row.status,
    assignedStudentIds: row.assigned_student_ids || [],
  };
}

function mapStudent(row) {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    subject: row.subject,
    teacher: row.teacher,
    totalHours: row.total_hours,
    usedHours: row.used_hours,
    daysAttended: row.days_attended,
    totalDays: row.total_days,
    paymentStatus: row.payment_status,
    paymentAmount: row.payment_amount,
    completionStatus: row.completion_status,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    enrolledDate: row.enrolled_date,
    parentId: row.parent_id,
    avatar: row.avatar,
  };
}

function mapContact(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    subject: row.subject,
    teacher: row.teacher,
    phone: row.phone,
    avatar: row.avatar,
    status: row.status,
    lastActive: row.last_active,
    students: row.students,
  };
}

// Reverse map for saving
function unmapContact(c) {
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    email: c.email,
    subject: c.subject,
    teacher: c.teacher,
    phone: c.phone,
    avatar: c.avatar,
    status: c.status,
    last_active: c.lastActive,
  };
}

// --- Teachers ---
export async function fetchTeachers() {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('id');
  if (error) throw error;
  return (data || []).map(mapTeacher);
}

export async function updateTeacher(teacher) {
  const mapped = {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    subject: teacher.subject,
    phone: teacher.phone,
    avatar: teacher.avatar,
    status: teacher.status,
    assigned_student_ids: teacher.assignedStudentIds,
  };
  const { error } = await supabase
    .from('teachers')
    .upsert(mapped);
  if (error) throw error;
}

// --- Students ---
export async function fetchStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('id');
  if (error) throw error;
  return (data || []).map(mapStudent);
}

// --- Contacts ---
export async function fetchContacts() {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('id');
  if (error) throw error;
  return (data || []).map(mapContact);
}

export async function saveContacts(contacts) {
  const mapped = contacts.map(unmapContact);
  // Delete all and re-insert (simple approach for client-managed list)
  await supabase.from('contacts').delete().neq('id', -1);
  if (mapped.length > 0) {
    const { error } = await supabase.from('contacts').insert(mapped);
    if (error) throw error;
  }
}

// --- Video Room Contacts ---
export async function fetchVideoRoomContacts(userId) {
  const { data, error } = await supabase
    .from('video_room_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(c => ({ id: c.id, name: c.contact_name }));
}

export async function addVideoRoomContact(userId, name) {
  const { data, error } = await supabase
    .from('video_room_contacts')
    .insert({ user_id: userId, contact_name: name })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id, name };
}

export async function removeVideoRoomContact(id) {
  const { error } = await supabase
    .from('video_room_contacts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// FAMILY ACCOUNT SYSTEM
// ============================================

/**
 * Generate a unique 6-character family code.
 */
export function generateFamilyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FAM-${code}`;
}

/**
 * Create a new family with a unique code.
 */
export async function createFamily(name, createdBy) {
  let code = generateFamilyCode();
  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('families')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
    code = generateFamilyCode();
    attempts++;
  }

  const { data, error } = await supabase
    .from('families')
    .insert({
      code,
      name: name || `Family ${code}`,
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find a family by its code.
 */
export async function findFamilyByCode(code) {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Get all members of a family.
 */
export async function getFamilyMembers(familyId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', familyId)
    .order('role', { ascending: true })
    .order('name');
  if (error) throw error;
  return data || [];
}

/**
 * Sign up a new user and link them to a family.
 */
export async function signUpWithFamily({ name, email, phone, password, role, familyId, usedPhone }) {
  const finalEmail = usedPhone ? phoneToVirtualEmail(phone) : email;
  const { data, error } = await supabase.auth.signUp({
    email: finalEmail,
    password,
    options: {
      data: { name, phone, role, family_id: familyId },
    },
  });
  if (error) throw error;

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name,
      email: finalEmail,
      phone: usedPhone ? phone : (phone || ''),
      role,
      family_id: familyId,
      avatar: role === 'parent' ? '👨‍👩‍👧' : '🎓',
    }, { onConflict: 'id' });
  }
  return data;
}

/**
 * Sign in and return profile with family data.
 */
export async function signInWithFamily(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    let family = null;
    let familyMembers = [];
    if (profile?.family_id) {
      const { data: fam } = await supabase
        .from('families')
        .select('*')
        .eq('id', profile.family_id)
        .maybeSingle();
      family = fam;
      familyMembers = await getFamilyMembers(profile.family_id);
    }

    return { user: data.user, profile, family, familyMembers };
  }
  return data;
}

/**
 * Updated signIn to also load family data.
 */
const originalSignIn = signIn;
export { originalSignIn };

export default supabase;
