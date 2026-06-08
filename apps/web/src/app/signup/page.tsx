'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Sparkles } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]               = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');
  const [successMsg, setSuccessMsg]         = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setSuccessMsg('Account created! Check your email to verify, then sign in.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--accent)');
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--border)');

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '40px 36px',
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Create account
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Join OrbitNote</p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div
            className="fade-in"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 14px',
              background: 'var(--red-bg)',
              border: '1px solid rgba(224,108,117,0.2)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--red)',
              marginBottom: 20,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            className="fade-in"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 14px',
              background: 'var(--green-bg)',
              border: '1px solid rgba(77,147,117,0.2)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--green)',
              marginBottom: 20,
            }}
          >
            <Sparkles size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              justifyContent: 'center',
              padding: '11px',
              fontSize: 14,
              borderRadius: 8,
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
