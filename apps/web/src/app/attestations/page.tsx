'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, FileText, File } from 'lucide-react';

interface AttestationItem {
  id: string;
  provider: string;
  operationType: string;
  measurement: string;
  timestamp: string;
  note?: { id: string; title: string };
  file?: { id: string; filename: string };
}

export default function AttestationsPage() {
  const [attestations, setAttestations] = useState<AttestationItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/attestations?page=${page}&limit=20`)
      .then((data) => {
        setAttestations(data.items);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const getName = (item: AttestationItem) => {
    if (item.note) return item.note.title || 'Untitled note';
    if (item.file) return item.file.filename || 'File';
    return 'Resource';
  };

  const getType = (item: AttestationItem): 'note' | 'file' => item.note ? 'note' : 'file';

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <div className="page-enter" style={{ padding: '44px 56px', maxWidth: 860, margin: '0 auto' }}>

      {/* Title */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Trust & Verification
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Every note and file you save is privately verified.
        </p>
      </div>

      {/* ── Trust cards ────────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
      ) : attestations.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 0',
            color: 'var(--text-muted)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 13,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <span style={{ fontSize: 22 }}>🛡</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
            No verifications yet
          </p>
          <p style={{ fontSize: 13 }}>
            Create a note or upload a file to see records here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attestations.map((item) => {
            const name = getName(item);
            const type = getType(item);
            const Icon = type === 'note' ? FileText : File;

            return (
              <div key={item.id} className="trust-card">
                {/* Type icon */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    size={16}
                    style={{ color: 'var(--text-muted)', opacity: 0.75 }}
                  />
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {name}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    {type === 'note' ? 'Note' : 'File'}
                  </p>
                </div>

                {/* Status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="status-dot pulse"
                    style={{ width: 6, height: 6 }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--green)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Verified
                  </span>
                </div>

                {/* Date */}
                <div
                  style={{
                    flexShrink: 0,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    minWidth: 80,
                    textAlign: 'right',
                  }}
                >
                  {formatDate(item.timestamp)}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                paddingTop: 20,
                marginTop: 4,
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn btn-ghost"
                style={{ padding: '5px 10px', opacity: page <= 1 ? 0.35 : 1 }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-ghost"
                style={{ padding: '5px 10px', opacity: page >= totalPages ? 0.35 : 1 }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
