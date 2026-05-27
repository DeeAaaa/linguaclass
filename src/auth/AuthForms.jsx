import React, { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import {
  createFamily,
  findFamilyByCode,
  signUpWithFamily,
  signInWithEmailOrPhone,
  signUpWithEmailOrPhone,
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

  const handleJoin = async () => {
    setError('');
    if (!code.trim()) { setError('Please enter a family code.'); return; }
    setLoading(true);
    try {
      const family = await findFamilyByCode(code.trim());
      if (!family) {
        setError('Family code not found. Please check and try again, or create a new family.');
        setLoading(false);
        return;
      }
      onJoinFamily(family);
    } catch (err) {
      console.warn('Family lookup failed (offline?):', err.message);
      // Fallback: simulate success for local/demo usage
      onJoinFamily({ id: Date.now(), code: code.trim().toUpperCase(), name: `Family ${code.trim().toUpperCase()}` });
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
      onCreateFamily(family);
    } catch (err) {
      console.warn('Family creation failed (offline?):', err.message);
      // Fallback for local/demo usage
      onCreateFamily({ id: Date.now(), code: 'FAM-' + Math.random().toString(36).slice(2, 8).toUpperCase(), name: newFamilyName.trim() });
    } finally {
      setLoading(false);
    }
  };

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
          <p className="family-hint">{t('familyCodeHint') || 'Ask your teacher or admin for the family code.'}</p>
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
// LOGIN FORM
// ============================================
export function LoginForm({ onSuccess, onTeacherLogin, onAdminLogin, t }) {
  const [authMethod, setAuthMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ADMIN_EMAIL = 'admin@linguaclass.com';
  const ADMIN_PASSWORD = 'LinguaAdmin2026';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) { setError(authMethod === 'email' ? 'Email is required.' : 'Phone is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    // === Admin login ===
    if (identifier.toLowerCase().trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      onAdminLogin();
      return;
    }

    // === Teacher login (check local teachers first) ===
    if (onTeacherLogin) {
      const teacherResult = await onTeacherLogin(identifier, password);
      if (teacherResult) return;
    }

    setLoading(true);
    try {
      // Try Supabase login
      const result = await signInWithEmailOrPhone(identifier.trim(), password);
      if (result.profile) {
        result.profile.phone = result.profile.phone || '';
        onSuccess(result.profile);
        return;
      }
      setError('Invalid credentials. Please try again.');
    } catch (supaErr) {
      console.warn('Supabase login failed:', supaErr.message);
      // Fallback: generic login for demo
      onSuccess({
        id: Date.now(),
        name: authMethod === 'email' ? identifier.split('@')[0] : 'User',
        email: authMethod === 'email' ? identifier.trim() : '',
        phone: authMethod === 'phone' ? identifier.trim() : '',
        role: 'student',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-step login-step">
      <div className="auth-step-header">
        <h3>{t('welcomeBack') || 'Welcome Back'}</h3>
        <p>{t('signInToContinue') || 'Sign in to continue to your classroom'}</p>
      </div>

      <form onSubmit={handleLogin}>
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
          placeholder={t('password') || 'Password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="btn-auth-submit" disabled={loading}>
          {loading ? '...' : (t('signIn') || 'Sign In')}
        </button>
      </form>
    </div>
  );
}
