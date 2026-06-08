'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, FileText } from 'lucide-react';

interface NoteSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  attestationId: string | null;
}

interface NoteDetail extends NoteSummary {
  content: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function NotesPage() {
  const [notes, setNotes]                 = useState<NoteSummary[]>([]);
  const [selectedNote, setSelectedNote]   = useState<NoteDetail | null>(null);
  const [loading, setLoading]             = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch]               = useState('');
  const [saveStatus, setSaveStatus]       = useState<SaveStatus>('idle');
  const [isFocused, setIsFocused]         = useState(false); // focus mode

  const [editorTitle, setEditorTitle]     = useState('');
  const [editorContent, setEditorContent] = useState('');

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef   = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch list ──────────────────────────────────────────────────────────
  const fetchNotes = useCallback(() => {
    setLoading(true);
    api.get('/api/notes')
      .then((data) => setNotes(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // ── Select note ─────────────────────────────────────────────────────────
  const handleSelectNote = useCallback((id: string) => {
    if (selectedNote?.id === id) return;
    setDetailLoading(true);
    setIsFocused(false);
    api.get(`/api/notes/${id}`)
      .then((data: NoteDetail) => {
        setSelectedNote(data);
        setEditorTitle(data.title);
        setEditorContent(data.content);
        setSaveStatus('idle');
        // Focus title if blank, else body
        requestAnimationFrame(() => {
          if (!data.title || data.title === 'Untitled') {
            titleRef.current?.focus();
          } else {
            contentRef.current?.focus();
          }
        });
      })
      .catch((err) => alert(err.message || 'Could not open note'))
      .finally(() => setDetailLoading(false));
  }, [selectedNote?.id]);

  // ── Auto-save (1.5s debounce) ───────────────────────────────────────────
  const triggerSave = useCallback((noteId: string, title: string, content: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/api/notes/${noteId}`, { title, content });
        setSaveStatus('saved');
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, title, updatedAt: new Date().toISOString() } : n
          )
        );
        setTimeout(() => setSaveStatus('idle'), 2200);
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditorTitle(val);
    if (selectedNote) triggerSave(selectedNote.id, val, editorContent);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorContent(val);
    if (selectedNote) triggerSave(selectedNote.id, editorTitle, val);
  };

  // ── Create ──────────────────────────────────────────────────────────────
  const handleCreateNote = async () => {
    try {
      const response = await api.post('/api/notes', { title: 'Untitled', content: '' });
      fetchNotes();
      handleSelectNote(response.id);
    } catch (err: any) {
      alert(err.message || 'Could not create note');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Move this note to trash?')) return;
    try {
      await api.delete(`/api/notes/${id}`);
      if (selectedNote?.id === id) { setSelectedNote(null); }
      fetchNotes();
    } catch (err: any) {
      alert(err.message || 'Could not delete note');
    }
  };

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter" style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Left panel: Note list ─────────────────────────────────────── */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          height: '100dvh',
          overflowY: 'auto',
          /* Dim when editor is focused */
          opacity: isFocused ? 0.5 : 1,
          transition: 'opacity 250ms var(--ease-soft)',
        }}
        onMouseEnter={() => isFocused && setIsFocused(false)}
      >
        {/* List header */}
        <div
          style={{
            padding: '16px 10px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-surface)',
            zIndex: 1,
          }}
        >
          <span className="section-label" style={{ margin: 0 }}>Notes</span>
          <button
            onClick={handleCreateNote}
            className="btn btn-ghost"
            style={{ padding: '3px 7px', fontSize: 12 }}
            title="New note"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 6px 6px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={12}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%',
                padding: '5px 7px 5px 26px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color var(--duration-fast) ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        {/* Note list */}
        <div style={{ flex: 1, padding: '2px 4px', overflowY: 'auto' }}>
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 8px' }}>Loading…</p>
          ) : filteredNotes.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 8px' }}>
              {search ? 'No results' : 'No notes yet'}
            </p>
          ) : (
            filteredNotes.map((note) => {
              const isActive = selectedNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note.id)}
                  className={`note-item${isActive ? ' active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectNote(note.id)}
                >
                  {/* Left: icon + title + date */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, flex: 1 }}>
                    <FileText
                      size={13}
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                        transition: 'color var(--duration-fast) ease',
                        opacity: 0.8,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? 500 : 400,
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.4,
                        }}
                      >
                        {note.title || 'Untitled'}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginTop: 2,
                          lineHeight: 1.3,
                        }}
                      >
                        {new Date(note.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Delete (shown on hover via CSS) */}
                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="note-delete btn btn-ghost"
                    style={{ padding: '2px 4px', flexShrink: 0 }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: Editor ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          overflow: 'hidden',
          background: 'var(--bg-base)',
          /* Brighten slightly when focused */
          filter: isFocused ? 'brightness(1.03)' : 'brightness(1)',
          transition: 'filter 250ms var(--ease-soft)',
        }}
      >
        {detailLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              className="spin"
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '2px solid var(--border-light)',
                borderTopColor: 'var(--accent)',
              }}
            />
          </div>
        ) : selectedNote ? (
          <>
            {/* Toolbar */}
            <div
              style={{
                padding: '10px 48px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
                flexShrink: 0,
                minHeight: 44,
                background: 'var(--bg-base)',
              }}
            >
              {saveStatus === 'saving' && (
                <span className="save-status fade-in">Saving…</span>
              )}
              {saveStatus === 'saved' && (
                <span className="save-status fade-in" style={{ color: 'var(--green)' }}>✓ Saved</span>
              )}
              <span className="secure-badge">🛡 Encrypted</span>
            </div>

            {/* Editor body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '52px 72px',
                maxWidth: 900,
                width: '100%',
                margin: '0 auto',
              }}
            >
              {/* Title */}
              <input
                ref={titleRef}
                type="text"
                value={editorTitle}
                onChange={handleTitleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 100)}
                placeholder="Untitled"
                className="notion-input"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2,
                  marginBottom: 20,
                  color: 'var(--text-primary)',
                  paddingBottom: 4,
                }}
              />

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 28, opacity: 0.6 }} />

              {/* Body */}
              <textarea
                ref={contentRef}
                value={editorContent}
                onChange={handleContentChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 100)}
                placeholder="Start writing…"
                className="notion-input"
                style={{
                  flex: 1,
                  minHeight: '60vh',
                  fontSize: 15.5,
                  lineHeight: 1.78,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.005em',
                }}
              />
            </div>
          </>
        ) : (
          /* Empty state */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 48,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={24} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
            </div>
            <div>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>
                Select a note to open it
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                or create a new one to start writing
              </p>
            </div>
            <button onClick={handleCreateNote} className="btn btn-primary" style={{ marginTop: 4 }}>
              <Plus size={13} />
              New note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
