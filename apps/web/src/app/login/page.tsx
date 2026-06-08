'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/notes` },
        });
        if (error) throw error;
        setSuccessMsg('Check your email for a sign-in link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/notes');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sign in to OrbitNote</p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div
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
            className="fade-in"
          >
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
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
            className="fade-in"
          >
            <Sparkles size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 14,
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {!isMagicLink && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => { setIsMagicLink(!isMagicLink); setErrorMsg(''); setSuccessMsg(''); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--accent)',
              textAlign: 'left',
              padding: 0,
            }}
          >
            {isMagicLink ? 'Sign in with password' : 'Email me a sign-in link'}
          </button>

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
            {loading ? 'Signing in…' : isMagicLink ? 'Send link' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
