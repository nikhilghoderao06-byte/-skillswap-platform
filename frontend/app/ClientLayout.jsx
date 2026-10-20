'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';

export default function ClientLayout({ children }) {
  // Register the service worker (live site only) so the app can be installed and shows an offline page
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
