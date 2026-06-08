'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sidebar } from './sidebar';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [loading, setLoading]           = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(!!session);
    });

    return () => { subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleAuthChange = (hasSession: boolean) => {
    setIsAuthenticated(hasSession);
    const isAuthRoute = pathname === '/login' || pathname === '/signup';

    if (!hasSession && !isAuthRoute) {
      router.push('/login');
    } else if (hasSession && isAuthRoute) {
      router.push('/notes');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '2px solid var(--border-light)',
              borderTopColor: 'var(--accent)',
              margin: '0 auto 12px',
            }}
            className="spin"
          />
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  if (isAuthRoute) return <>{children}</>;
  if (!isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: 'var(--sidebar-width)',
          overflowY: 'auto',
          minHeight: '100dvh',
        }}
      >
        {children}
      </main>
    </div>
  );
}
