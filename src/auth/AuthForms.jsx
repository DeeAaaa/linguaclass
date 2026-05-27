import React, { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import {
  createFamily,
  findFamilyByCode,
  signUpWithFamily,
  signInLocal,
  supabase,
} from '../supabase';

// ============================================
// UTILITY
// ============================================
function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

// ============================================
// FAMILY CODE STEP (Register)
// ============================================
export function FamilyCodeStep({ onJoinFamily, onCreateFamily, t }) {
  const [code, setCode] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('join'); // 'join' | 'create'
  const [createdFamily, setCreatedFamily] = useState(null); // show code after creation

  const handleJoin = async () => {
    setError('');
    if (!code.trim()) { setError('Please enter a family code.'); return; }
    setLoading(true);
    try {
      const family = await findFamilyByCode(code.trim());
      if (!family) {
        setError('Family code not found. Please check the code and try again. Make sure the family creator shares the exact code with you.');
        setLoading(false);
        return;
      }
      onJoinFamily(family);
    } catch (err) {
      setError('Could not look up family. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    if (!newFamilyName.trim()) { setError('Please enter a family name.'); return; }
    setLoading(true);
    try {
      const family = await createFamily(newFamilyName.trim(), 'self');
      setCreatedFamily(family);
    } catch (err) {
      setError('Failed to create family. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // After family is created, show the code prominently
  if (createdFamily) {
    return (
      <div className="family-code-step">
        <div className="family-step-header">
          <span className="family-step-icon">🏠</span>
          <h3>{t('familySetup') || 'Family Created!'}</h3>
        </div>

        <div className="family-code-display">
          <p className="family-code-label">{t('familyCodeLabel') || 'Your Family Code'}</p>
          <div className="family-code-big">{createdFamily.code}</div>
          <p className="family-code-share-hint">
            {t('shareCodeHint') || 'Share this code with your family members so they can join. They will need it when registering.'}
          </p>
        </div>

        <div className="family-code-actions">
          <button
            className="btn-family-copy"
            onClick={() => {
              navigator.clipboard.writeText(createdFamily.code);
              alert(t('codeCopied') || 'Code copied to clipboard!');
            }}
          >
            📋 {t('copyCode') || 'Copy Code'}
          </button>
          <button
            className="btn-family-continue"
            onClick={() => onCreateFamily(createdFamily)}
          >
            {t('continueToRegister') || 'Continue to Register'} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="family-code-step">
      <div className="family-step-header">
        <span className="family-step-icon">🏠</span>
        <h3>{t('familySetup') || 'Family Setup'}</h3>
        <p>{t('familySetupDesc') || 'Join your family or create a new one'}</p>
      </div>

      <div className="family-mode-tabs">
        <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>
          {t('joinFamily') || 'Join Existing Family'}
        </button>
        <button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
          {t('createFamily') || 'Create New Family'}
        </button>
      </div>

      {mode === 'join' ? (
        <div className="family-join-form">
          <label>{t('familyCodeLabel') || 'Enter your Family Code'}</label>
          <div className="family-code-input-row">
            <input
              type="text"
              placeholder="FAM-XXXXXX"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={10}
              className="family-code-input"
            />
            <button
              className="btn-family-action"
              onClick={handleJoin}
              disabled={loading || !code.trim()}
            >
              {loading ? '...' : (t('join') || 'Join')}
            </button>
          </div>
          <p className="family-hint">{t('familyCodeHint') || 'Ask the family creator for the family code. It looks like FAM-XXXXXX.'}</p>
        </div>
      ) : (
        <div className="family-create-form">
          <label>{t('familyNameLabel') || 'Family Name'}</label>
          <input
            type="text"
            placeholder={t('familyNamePlaceholder') || 'e.g. The Smith Family'}
            value={newFamilyName}
            onChange={e => setNewFamilyName(e.target.value)}
          />
          <button
            className="btn-family-action btn-family-create"
            onClick={handleCreate}
            disabled={loading || !newFamilyName.trim()}
          >
            {loading ? '...' : (t('createAndContinue') || 'Create & Continue')}
          </button>
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}

// ============================================
// REGISTER FORM
// ============================================
export function RegisterForm({ family, onBack, onSuccess, t }) {
  const [name, setName] = useState('');
  const [authMethod, setAuthMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'parent'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Name is required.'); return; }
    if (!identifier.trim()) { setError(authMethod === 'email' ? 'Email is required.' : 'Phone is required.'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (authMethod === 'email' && !isEmail(identifier)) { setError('Please enter a valid email.'); return; }

    setLoading(true);
    try {
      const userData = {
        name: name.trim(),
        email: authMethod === 'email' ? identifier.trim() : '',
        phone: authMethod === 'phone' ? identifier.trim() : '',
        password,
        role,
        familyId: family.id,
        usedPhone: authMethod === 'phone',
      };

      let result;
      try {
        // Try Supabase with family
        result = await signUpWithFamily(userData);
      } catch (supaErr) {
        console.warn('Supabase family signup failed, using local demo:', supaErr.message);
        throw supaErr;
      }

      onSuccess({
        id: result.user?.id || Date.now(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role,
        familyId: family.id,
        familyCode: family.code,
        familyName: family.name,
      });
    } catch (err) {
      // Offline/demo fallback
      console.warn('Registration fallback:', err.message);
      onSuccess({
        id: Date.now(),
        name: name.trim(),
        email: authMethod === 'email' ? identifier.trim() : '',
        phone: authMethod === 'phone' ? identifier.trim() : '',
        role,
        familyId: family.id,
        familyCode: family.code,
        familyName: family.name,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-step register-step">
      <div className="auth-step-header">
        <button className="auth-back-btn" onClick={onBack}>← {t('back') || 'Back'}</button>
        <span className="family-badge">🏠 {family.code}</span>
        <h3>{t('createYourAccount') || 'Create Your Account'}</h3>
      </div>

      <form onSubmit={handleRegister}>
        <div className="role-select-row">
          <button
            type="button"
            className={`role-card ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            <span className="role-icon">🎓</span>
            <span className="role-label">{t('imStudent') || "I'm a Student"}</span>
          </button>
          <button
            type="button"
            className={`role-card ${role === 'parent' ? 'active' : ''}`}
            onClick={() => setRole('parent')}
          >
            <span className="role-icon">👨‍👩‍👧</span>
            <span className="role-label">{t('imParent') || "I'm a Parent"}</span>
          </button>
        </div>

        <input
          type="text"
          placeholder={t('fullName') || 'Full Name'}
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <div className="auth-method-toggle">
          <button type="button" className={authMethod === 'email' ? 'active' : ''} onClick={() => { setAuthMethod('email'); setIdentifier(''); }}>📧 {t('emailLabel') || 'Email'}</button>
          <button type="button" className={authMethod === 'phone' ? 'active' : ''} onClick={() => { setAuthMethod('phone'); setIdentifier(''); }}>📱 {t('phoneLabel') || 'Phone'}</button>
        </div>

        <input
          type={authMethod === 'email' ? 'email' : 'tel'}
          placeholder={authMethod === 'email' ? (t('emailAddress') || 'Email address') : (t('phoneNumber') || 'Phone number')}
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder={t('password') || 'Password (min 6 characters)'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn-auth-submit" disabled={loading}>
          {loading ? '...' : (t('createAccount') || 'Create Account')}
        </button>
      </form>
    </div>
  );
}

// ============================================
// LOGIN FORM (support admin / teacher / family roles)
// ============================================
export function LoginForm({ role, onSuccess, onBack, t }) {
  const [authMethod, setAuthMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ADMIN_EMAIL = 'admin@linguaclass.com';
  const ADMIN_PASSWORD = 'LinguaAdmin2026';

  const getRoleLabel = () => {
    if (role === 'admin') return { icon: '🛡️', label: t('administrator') || 'Administrator' };
    if (role === 'teacher') return { icon: '👩‍🏫', label: t('teacher') || 'Teacher' };
    return { icon: '🏠', label: t('family') || 'Family' };
  };
  const roleInfo = getRoleLabel();
  const showPhoneOption = (role === 'family'); // Only family can login with phone

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    // ============================================================
    // 1. ADMIN LOGIN
    // ============================================================
    if (role === 'admin') {
      if (identifier.toLowerCase().trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        onSuccess({
          name: 'Administrator',
          email: ADMIN_EMAIL,
          role: 'admin',
          id: 0,
          phone: '',
        });
        return;
      }
      setError('Invalid admin credentials. Please try again.');
      return;
    }

    // ============================================================
    // 2. TEACHER LOGIN
    // ============================================================
    if (role === 'teacher') {
      setLoading(true);
      try {
        const storedStr = localStorage.getItem('lingua_managed_teachers');
        const teachers = storedStr ? JSON.parse(storedStr) : defaultTeachers();
        const matched = teachers.find(t =>
          t.email.toLowerCase() === identifier.toLowerCase() &&
          t.password === password &&
          t.status !== 'inactive'
        );
        if (matched) {
          onSuccess({
            name: matched.name,
            email: matched.email,
            role: 'teacher',
            id: matched.id,
            phone: matched.phone || '',
            subject: matched.subject,
          });
          return;
        }
        setError('Invalid teacher credentials. Please check your email and password.');
      } catch (err) {
        setError(err.message || 'Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ============================================================
    // 3. FAMILY LOGIN (student / parent)
    // ============================================================
    setLoading(true);
    try {
      const result = await signInLocal(identifier.trim(), password);
      if (result.profile) {
        // Only allow family roles (student/parent) through family login
        if (result.profile.role === 'admin' || result.profile.role === 'teacher') {
          setError('Please use the Administrator or Teacher login for this account.');
          return;
        }
        result.profile.phone = result.profile.phone || '';
        onSuccess(result.profile);
        return;
      }
      setError('Invalid credentials. Please check your email/phone and password.');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  function defaultTeachers() {
    return [
      { id: 16, name: 'Dr. Sarah Mitchell', email: 'sarah.m@school.edu', password: 'teacher123', subject: 'English', phone: '', status: 'active' },
      { id: 17, name: 'Ms. Emily Chen', email: 'emily.c@school.edu', password: 'teacher123', subject: 'Mathematics', phone: '', status: 'active' },
      { id: 18, name: 'Dr. Robert Kim', email: 'robert.k@school.edu', password: 'teacher123', subject: 'Science', phone: '', status: 'active' },
      { id: 19, name: 'Prof. James Wilson', email: 'james.w@school.edu', password: 'teacher123', subject: 'English', phone: '', status: 'active' },
    ];
  }

  return (
    <div className="auth-step login-step">
      {onBack && (
        <button className="auth-back-btn" onClick={onBack}>← {t('back') || 'Back'}</button>
      )}
      <div className="auth-step-header">
        <span className="login-role-badge">{roleInfo.icon} {roleInfo.label}</span>
        <h3>{t('welcomeBack') || 'Welcome Back'}</h3>
        <p>{t('signInToContinue') || 'Sign in to continue to your classroom'}</p>
      </div>

      <form onSubmit={handleLogin}>
        {showPhoneOption && (
          <div className="auth-method-toggle">
            <button type="button" className={authMethod === 'email' ? 'active' : ''} onClick={() => { setAuthMethod('email'); setIdentifier(''); }}>📧 {t('emailLabel') || 'Email'}</button>
            <button type="button" className={authMethod === 'phone' ? 'active' : ''} onClick={() => { setAuthMethod('phone'); setIdentifier(''); }}>📱 {t('phoneLabel') || 'Phone'}</button>
          </div>
        )}

        <input
          type={showPhoneOption && authMethod === 'phone' ? 'tel' : 'email'}
          placeholder={
            showPhoneOption && authMethod === 'phone'
              ? (t('phoneNumber') || 'Phone number')
              : (t('emailAddress') || 'Email address')
          }
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder={t('password') || 'Password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn-auth-submit" disabled={loading}>
          {loading ? '...' : (t('signIn') || 'Sign In')}
        </button>

        {role === 'teacher' && (
          <p className="login-hint">Default password: <strong>teacher123</strong></p>
        )}
      </form>
    </div>
  );
}
