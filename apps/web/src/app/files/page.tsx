'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Upload, Trash2, Download, File, X, AlertCircle, FileText, Image, FileCode } from 'lucide-react';
import { MAX_UPLOAD_SIZE, SUPPORTED_FILE_TYPES } from '@orbitnote/shared';

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  attestationId: string | null;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('text')) return FileCode;
  return File;
};

const getFileAccent = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '#4d9375';
  if (mimeType === 'application/pdf') return '#e06c75';
  if (mimeType.includes('word')) return '#4a9eff';
  return '#787878';
};

export default function FilesPage() {
  const [files, setFiles]               = useState<FileItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const [dragOver, setDragOver]         = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile]   = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(() => {
    setLoading(true);
    api.get('/api/files')
      .then((data) => setFiles(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_UPLOAD_SIZE) return 'File exceeds the 10 MB limit.';
    if (!SUPPORTED_FILE_TYPES.includes(file.type))
      return 'Unsupported type. Accepted: PDF, DOCX, TXT, PNG, JPG.';
    return null;
  };

  const selectFile = (file: File) => {
    const err = validateFile(file);
    if (err) { setUploadError(err); return; }
    setUploadError('');
    setPendingFile(file);
  };

  // Drag handlers
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  // Auto-upload when file selected
  const doUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/api/files/upload', formData);
      setPendingFile(null);
      fetchFiles();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [fetchFiles]);

  useEffect(() => {
    if (pendingFile && !uploading) doUpload(pendingFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

  const handleDownload = async (id: string, filename: string) => {
    setDownloadingId(id);
    try {
      const result = await api.get(`/api/files/${id}/download`);
      if (result?.blob) {
        const url = window.URL.createObjectURL(result.blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this file?')) return;
    try {
      await api.delete(`/api/files/${id}`);
      fetchFiles();
    } catch (err: any) {
      alert(`Could not delete: ${err.message}`);
    }
  };

  return (
    <div className="page-enter" style={{ padding: '44px 56px', maxWidth: 900, margin: '0 auto' }}>

      {/* Page title */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Files</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Drop files anywhere to upload · 10 MB max per file
        </p>
      </div>

      {/* ── Drop zone ──────────────────────────────────────────────────── */}
      <div
        className={`drop-zone${dragOver ? ' dragging' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '56px 24px',
          marginBottom: 28,
          textAlign: 'center',
          minHeight: 180,
        }}
      >
        {uploading ? (
          <>
            <div
              className="spin"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '2px solid var(--border-light)',
                borderTopColor: 'var(--accent)',
              }}
            />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Uploading…</p>
          </>
        ) : dragOver ? (
          <>
            <Upload size={26} style={{ color: 'var(--accent)' }} />
            <p style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>Drop to upload</p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Upload size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Drop files here or{' '}
                <span style={{ color: 'var(--accent)' }}>browse</span>
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                PDF, DOCX, TXT, PNG, JPG — up to 10 MB
              </p>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <div
          className="fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--red-bg)',
            border: '1px solid var(--red-border)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--red)',
            marginBottom: 24,
          }}
        >
          <AlertCircle size={14} />
          {uploadError}
          <button
            onClick={() => setUploadError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 2 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── File cards grid ────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No files yet — drop something above to get started.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {files.map((file) => {
            const FileIcon  = getFileIcon(file.mimeType);
            const accent    = getFileAccent(file.mimeType);
            const isDown    = downloadingId === file.id;

            return (
              <div key={file.id} className="file-card">
                {/* Icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9,
                    background: `${accent}18`,
                    border: `1px solid ${accent}28`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileIcon size={18} style={{ color: accent }} />
                </div>

                {/* Info */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={file.filename}
                  >
                    {file.filename}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatBytes(file.fileSize)}
                    </span>
                    <span className="secure-badge" style={{ fontSize: 10, padding: '1px 7px' }}>🛡</span>
                  </div>
                </div>

                {/* Hover actions */}
                <div className="file-actions">
                  <button
                    onClick={() => handleDownload(file.id, file.filename)}
                    disabled={downloadingId !== null}
                    className="btn btn-ghost"
                    style={{ padding: '5px 7px', opacity: isDown ? 0.5 : 1 }}
                    title="Download"
                  >
                    {isDown ? (
                      <div className="spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid var(--border-light)', borderTopColor: 'var(--accent)' }} />
                    ) : (
                      <Download size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="btn btn-ghost"
                    style={{ padding: '5px 7px' }}
                    title="Delete"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-bg)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ''; (e.currentTarget as HTMLButtonElement).style.background = ''; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
