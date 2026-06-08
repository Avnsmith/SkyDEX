'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [email, setEmail]     = useState('');
  const [created, setCreated] = useState('');
  const kmsKeyId = process.env.NEXT_PUBLIC_ORBITPORT_KMS_KEY_ID || '—';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || '');
        setCreated(user.created_at || '');
      }
    });
  }, []);

  const createdLabel = created
    ? new Date(created).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '…';

  return (
    <div className="page-enter" style={{ padding: '44px 56px', maxWidth: 580, margin: '0 auto' }}>

      {/* Title */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h1>
      </div>

      {/* ── Account section ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <p className="section-label">Account</p>
        <div
          className="card"
          style={{ padding: '0 20px' }}
        >
          <div className="settings-row">
            <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 450 }}>
              Email
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {email || '…'}
            </span>
          </div>
          <div className="settings-row" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 450 }}>
              Member since
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {createdLabel}
            </span>
          </div>
        </div>
      </section>

      {/* ── Security section ─────────────────────────────────────────── */}
      <section>
        <p className="section-label">Security</p>
        <div
          className="card"
          style={{ padding: '0 20px' }}
        >
          <div className="settings-row">
            <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 450 }}>
              KMS Key ID
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontFamily: 'ui-monospace, monospace',
                background: 'var(--bg-hover)',
                padding: '3px 8px',
                borderRadius: 5,
                border: '1px solid var(--border)',
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={kmsKeyId}
            >
              {kmsKeyId}
            </span>
          </div>
          <div className="settings-row" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 450 }}>
              Connection
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13,
                color: 'var(--green)',
                fontWeight: 500,
              }}
            >
              <span className="status-dot pulse" />
              Connected
            </span>
          </div>
        </div>
      </section>

    </div>
  );
}
