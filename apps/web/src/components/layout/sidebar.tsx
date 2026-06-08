'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, FolderClosed, ShieldCheck, Settings, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { name: 'Notes',        href: '/notes',        icon: FileText     },
  { name: 'Files',        href: '/files',        icon: FolderClosed },
  { name: 'Attestations', href: '/attestations', icon: ShieldCheck  },
  { name: 'Settings',     href: '/settings',     icon: Settings     },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: '18px 14px 14px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: '13.5px',
            fontWeight: '600',
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
            opacity: 0.9,
          }}
        >
          OrbitNote
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item${isActive ? ' active' : ''}`}
              style={{ marginBottom: 2 }}
            >
              <Icon
                size={14}
                strokeWidth={isActive ? 2 : 1.7}
                style={{
                  flexShrink: 0,
                  opacity: isActive ? 0.9 : 0.6,
                  transition: 'opacity 120ms ease, stroke-width 120ms ease',
                }}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '6px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleSignOut}
          className="nav-item"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '12.5px',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)';
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-bg)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <LogOut size={13} strokeWidth={1.7} style={{ opacity: 0.6 }} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
