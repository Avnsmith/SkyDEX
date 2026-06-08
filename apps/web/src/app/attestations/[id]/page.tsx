'use client';

import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { ChevronLeft, ShieldCheck, FileText, File } from 'lucide-react';
import Link from 'next/link';

interface AttestationDetail {
  id: string;
  provider: string;
  operationType: string;
  measurement: string;
  timestamp: string;
  metadataJson: any;
  note?: { id: string; title: string };
  file?: { id: string; filename: string };
}

export default function AttestationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const [detail, setDetail] = useState<AttestationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get(`/api/attestations/${id}`)
      .then((data) => setDetail(data))
      .catch((err) => setError(err.message || 'Could not load record'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-light)', borderTopColor: 'var(--accent)' }} className="spin" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: '40px 48px' }}>
        <Link href="/attestations" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <p style={{ color: 'var(--red)', fontSize: 13 }}>{error || 'Record not found'}</p>
      </div>
    );
  }

  const linkedName = detail.note?.title || detail.file?.filename;
  const linkedHref = detail.note ? '/notes' : '/files';
  const LinkedIcon = detail.note ? FileText : File;

  return (
    <div style={{ padding: '40px 48px', maxWidth: 720, margin: '0 auto' }}>
      {/* Back */}
      <Link
        href="/attestations"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}
      >
        <ChevronLeft size={14} /> Trust & Verification
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Verification Record</h1>
          {linkedName && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {linkedName}
            </p>
          )}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--green-bg)', border: '1px solid rgba(77,147,117,0.2)', borderRadius: 20, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
          <ShieldCheck size={14} />
          Verified
        </span>
      </div>

      {/* Detail card */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {linkedName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resource</span>
              <Link
                href={linkedHref}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)' }}
              >
                <LinkedIcon size={13} />
                {linkedName}
              </Link>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {new Date(detail.timestamp).toLocaleString()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span className="status-dot" />
              <span style={{ color: 'var(--green)', fontWeight: 500 }}>Verified</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
