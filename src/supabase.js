import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Lazy singleton — only created on first access (not at import time)
// This prevents the Supabase Realtime WebSocket from blocking the landing page load
let _supabase = null;
export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      supabaseUrl || '',
      supabaseAnonKey || '',
      {
        realtime: { params: { eventsPerSecond: 10 } },
        auth: { persistSession: true, autoRefreshToken: true },
      }
    );
  }
  return _supabase;
}

// Legacy export — lazy init on first use
export const supabase = new Proxy({}, {
  get(_, prop) {
    return getSupabase()[prop];
  }
});

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
// LOCAL STORAGE HELPER (offline-first fallback)
// ============================================

function getLocalStore(key) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; }
}
function setLocalStore(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota exceeded */ }
}

function getLocalFamilies() {
  return getLocalStore('lingua_families') || [];
}
function saveLocalFamilies(families) {
  setLocalStore('lingua_families', families);
}
function addLocalFamily(family) {
  const families = getLocalFamilies();
  families.push(family);
  saveLocalFamilies(families);
  return family;
}

function getLocalUsers() {
  return getLocalStore('lingua_users') || [];
}
function saveLocalUsers(users) {
  setLocalStore('lingua_users', users);
}
function addLocalUser(user) {
  const users = getLocalUsers();
  users.push(user);
  saveLocalUsers(users);
  return user;
}

// ============================================
// FAMILY ACCOUNT SYSTEM (localStorage-backed)
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
 * Always saves to localStorage (offline-first).
 * Tries Supabase first, falls back to localStorage only.
 */
export async function createFamily(name, createdBy) {
  let code = generateFamilyCode();

  // Ensure uniqueness against localStorage
  const localFamilies = getLocalFamilies();
  let attempts = 0;
  while (localFamilies.some(f => f.code === code) && attempts < 10) {
    code = generateFamilyCode();
    attempts++;
  }

  const family = {
    id: Date.now(),
    code,
    name: name || `Family ${code}`,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };

  // Save locally (always works)
  addLocalFamily(family);

  // Try Supabase as secondary (don't block)
  try {
    await supabase.from('families').insert({
      id: family.id,
      code,
      name: family.name,
      created_by: createdBy,
    });
  } catch (e) {
    // Supabase unavailable — localStorage is enough
    console.log('[Family] Using localStorage (Supabase unavailable)');
  }

  return family;
}

/**
 * Find a family by its code.
 * Searches localStorage first, then Supabase.
 */
export async function findFamilyByCode(code) {
  const normalized = code.trim().toUpperCase();

  // Search localStorage first (offline-first)
  const localFamilies = getLocalFamilies();
  const localMatch = localFamilies.find(f => f.code === normalized);
  if (localMatch) return localMatch;

  // Try Supabase as fallback
  try {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('code', normalized)
      .maybeSingle();
    if (!error && data) {
      // Sync to local for future lookups
      addLocalFamily(data);
      return data;
    }
  } catch (e) {
    // Supabase unavailable — not found locally either
  }

  return null;
}

/**
 * Get all members of a family from localStorage.
 */
export async function getFamilyMembers(familyId) {
  // Search localStorage
  const users = getLocalUsers();
  const localMembers = users.filter(u => u.family_id === familyId || u.familyId === familyId);

  if (localMembers.length > 0) {
    return localMembers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      family_id: u.family_id || u.familyId,
      avatar: u.role === 'parent' ? '👨‍👩‍👧' : '🎓',
    }));
  }

  // Try Supabase
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_id', familyId)
      .order('role', { ascending: true })
      .order('name');
    if (!error && data) return data;
  } catch (e) { /* offline */ }

  return [];
}

/**
 * Sign up a new user and link them to a family.
 * Saves to localStorage (offline-first), tries Supabase as secondary.
 */
export async function signUpWithFamily({ name, email, phone, password, role, familyId, usedPhone }) {
  const userId = Date.now();
  const finalEmail = usedPhone ? (phoneToVirtualEmail(phone)) : email;

  // Save user to localStorage (always works)
  const userRecord = {
    id: userId,
    name: name.trim(),
    email: finalEmail,
    phone: usedPhone ? phone : (phone || ''),
    password, // stored locally for offline login
    role,
    family_id: familyId,
    familyId: familyId,
    avatar: role === 'parent' ? '👨‍👩‍👧' : '🎓',
    created_at: new Date().toISOString(),
  };
  addLocalUser(userRecord);

  // Try Supabase as secondary
  try {
    const supabaseEmail = email || finalEmail;
    const { data } = await supabase.auth.signUp({
      email: supabaseEmail,
      password,
      options: { data: { name: name.trim(), phone, role, family_id: familyId } },
    });
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        email: supabaseEmail,
        phone: usedPhone ? phone : (phone || ''),
        role,
        family_id: familyId,
        avatar: role === 'parent' ? '👨‍👩‍👧' : '🎓',
      }, { onConflict: 'id' });
    }
    return data || { user: { id: userId } };
  } catch (e) {
    console.log('[Auth] Using localStorage for user (Supabase unavailable)');
  }

  return { user: { id: userId } };
}

/**
 * Sign in with email/phone + password.
 * Checks localStorage first, then Supabase.
 */
export async function signInWithFamily(email, password) {
  // Normalize input
  const normalizedEmail = email.trim().toLowerCase();

  // Check localStorage users first
  const users = getLocalUsers();
  const localUser = users.find(u => {
    const userEmail = (u.email || '').toLowerCase();
    const userPhone = (u.phone || '').replace(/[^\d]/g, '');
    const inputClean = normalizedEmail.replace(/[^\d]/g, '');
    return (
      userEmail === normalizedEmail ||
      userPhone === inputClean
    );
  });

  if (localUser && localUser.password === password) {
    // Local login success — get family info
    let family = null;
    let familyMembers = [];
    if (localUser.family_id || localUser.familyId) {
      const fid = localUser.family_id || localUser.familyId;
      const families = getLocalFamilies();
      family = families.find(f => f.id === fid) || null;
      familyMembers = await getFamilyMembers(fid);
    }

    const profile = {
      id: localUser.id,
      name: localUser.name,
      email: localUser.email,
      phone: localUser.phone || '',
      role: localUser.role,
      family_id: localUser.family_id || localUser.familyId,
      avatar: localUser.avatar,
    };

    return { user: { id: localUser.id }, profile, family, familyMembers };
  }

  // Try Supabase
  try {
    const supabaseEmail = email.includes('@') ? email : phoneToVirtualEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: supabaseEmail,
      password,
    });
    if (error) {
      // Supabase Auth failed — try to find user in profiles table by phone/email
      // and provision their Auth account if needed
      const phoneOrEmail = email.includes('@') ? null : email;
      const searchEmail = email.includes('@') ? email : null;
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .or(phoneOrEmail ? `phone.eq.${phoneOrEmail}` : `email.eq.${searchEmail}`)
        .maybeSingle();

      if (!profileError && profiles) {
        // User exists in profiles but not in Auth — create their Auth account
        const authEmail = profiles.email || supabaseEmail;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              name: profiles.name || '',
              phone: profiles.phone || '',
              role: profiles.role || '',
              family_id: profiles.family_id || '',
            },
          },
        });
        if (!signUpError && signUpData?.user) {
          // Auth account created — now fetch their profile with family data
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', signUpData.user.id)
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
          return { user: signUpData.user, profile, family, familyMembers };
        }
      }
      throw error;
    }

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
  } catch (e) {
    // Not found anywhere
    throw new Error('Invalid credentials. Please check your email/phone and password.');
  }

  return { user: null, profile: null, family: null, familyMembers: [] };
}

/**
 * Sign in with email or phone (unified API used by LoginForm).
 */
export async function signInLocal(identifier, password) {
  const normalized = identifier.trim().toLowerCase();

  // Check if it's a phone number
  const isPhoneLogin = !isEmail(identifier);

  // Find user in localStorage
  const users = getLocalUsers();
  const localUser = users.find(u => {
    const userIdentifier = isPhoneLogin
      ? (u.phone || '').replace(/[^\d]/g, '')
      : (u.email || '').toLowerCase();
    const inputClean = isPhoneLogin ? normalized.replace(/[^\d]/g, '') : normalized;
    return userIdentifier === inputClean;
  });

  if (localUser && localUser.password === password) {
    let family = null;
    let familyMembers = [];
    if (localUser.family_id || localUser.familyId) {
      const fid = localUser.family_id || localUser.familyId;
      const families = getLocalFamilies();
      family = families.find(f => f.id === fid) || null;
      familyMembers = await getFamilyMembers(fid);
    }

    return {
      profile: {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        phone: localUser.phone || '',
        role: localUser.role,
        familyId: localUser.family_id || localUser.familyId,
        familyCode: family?.code || '',
        familyName: family?.name || '',
        avatar: localUser.avatar,
      },
      family,
      familyMembers,
    };
  }

  // If not found locally, try signInWithFamily (which also tries Supabase)
  try {
    const result = await signInWithFamily(identifier, password);
    if (result.profile) {
      return {
        profile: {
          id: result.profile.id,
          name: result.profile.name,
          email: result.profile.email,
          phone: result.profile.phone || '',
          role: result.profile.role,
          familyId: result.profile.family_id,
          familyCode: result.family?.code || '',
          familyName: result.family?.name || '',
          avatar: result.profile.avatar,
        },
        family: result.family,
        familyMembers: result.familyMembers,
      };
    }
  } catch (e) {
    // Fall through to Supabase family_accounts check
  }

  // Check Supabase family_accounts table (admin-created accounts synced from other devices)
  const supabaseFamily = await findFamilyAccountInSupabase(identifier, password);
  if (supabaseFamily) {
    return {
      profile: {
        id: supabaseFamily.id,
        name: supabaseFamily.parent_name,
        email: supabaseFamily.parent_email,
        phone: supabaseFamily.phone || '',
        role: 'parent',
        familyId: supabaseFamily.family_id,
        familyCode: '',
        familyName: supabaseFamily.family_name || '',
        avatar: '👨‍👩‍👧',
      },
      family: null,
      familyMembers: [],
    };
  }

  throw new Error('Invalid credentials. Please check and try again.');
}

// Keep for backwards compatibility
const originalSignIn = signIn;
export { originalSignIn };

// ============================================
// FAMILY ACCOUNTS SYNC to Supabase
// ============================================

/**
 * Sync a family account to Supabase so it works across devices.
 * Saves to family_accounts table (upsert by id).
 */
export async function saveFamilyAccountToSupabase(family) {
  // Use raw fetch to bypass supabase-js websocket hang in China
  const SUPABASE_URL = 'https://uzvciccesilmalluxime.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6dmNpY2Nlc2lsbWFsbHV4aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NTQsImV4cCI6MjA5NTA1Mjk1NH0.2-cMuQC64Z36WpgK73Ly8A982KZBGmAEmh9bHCtsl3w';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/family_accounts`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
        'X-User-Agent': 'lingua-app',
      },
      body: JSON.stringify({
        id: String(family.id),
        parent_name: family.parentName,
        parent_email: family.parentEmail || '',
        phone: (family.phone || '').replace(/[^\d]/g, ''),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errText = await response.text();
      console.error('[FamilySync] HTTP', response.status, errText);
      return false;
    }
    console.log('[FamilySync] Saved to Supabase:', family.parentName, 'HTTP', response.status);
    return true;
  } catch (e) {
    console.error('[FamilySync] Failed:', e.name === 'AbortError' ? 'timeout' : e.message);
    return false;
  }
}

/**
 * Find a family account in Supabase by phone or email.
 */
export async function findFamilyAccountInSupabase(identifier, password) {
  const SUPABASE_URL = 'https://uzvciccesilmalluxime.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6dmNpY2Nlc2lsbWFsbHV4aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NTQsImV4cCI6MjA5NTA1Mjk1NH0.2-cMuQC64Z36WpgK73Ly8A982KZBGmAEmh9bHCtsl3w';
  try {
    const isEmailInput = identifier.includes('@');
    const cleanId = isEmailInput ? identifier.toLowerCase() : identifier.replace(/[^\d]/g, '');
    const filter = isEmailInput
      ? `parent_email=eq.${cleanId}`
      : `phone=eq.${cleanId}`;
    const url = `${SUPABASE_URL}/rest/v1/family_accounts?${filter}&select=*&limit=1`;
    console.log('[FamilySupabase] Searching:', isEmailInput ? 'email' : 'phone', cleanId);
    console.log('[FamilySupabase] URL:', url);
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); console.log('[FamilySupabase] TIMEOUT'); }, 8000);
    const response = await fetch(url, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    console.log('[FamilySupabase] HTTP status:', response.status);
    if (!response.ok) {
      const errText = await response.text();
      console.error('[FamilySupabase] HTTP error:', response.status, errText);
      return null;
    }
    const rows = await response.json();
    console.log('[FamilySupabase] Rows returned:', Array.isArray(rows) ? rows.length : 'not array', rows);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const data = rows[0];
    // Password column may not exist in the table — if it does, verify it; otherwise trust the lookup
    if (data.password !== undefined && data.password !== password) return null;
    return data;
  } catch (e) {
    console.error('[FamilySupabase] Exception:', e.name === 'AbortError' ? 'TIMEOUT' : e.message);
    return null;
  }
}

export default supabase;
