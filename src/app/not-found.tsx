"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Log 404 for debugging
    if (typeof window !== 'undefined') {
      console.log('404 error for path:', window.location.pathname);
    }
    
    // Don't auto-redirect on 404 to prevent redirect loops
    // Let the user stay and handle the error gracefully
  }, [router]);

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-ink-tertiary mb-4">404</h1>
        <div className="mt-4 text-lg font-medium text-ink-primary">Page Not Found</div>
        <div className="mt-2 text-sm text-ink-secondary">The page you&apos;re looking for doesn&apos;t exist.</div>
        <div className="mt-6 space-x-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover cursor-pointer transition-colors"
          >
            Refresh Page
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-surface-hover text-ink-primary border border-border-subtle rounded-md hover:bg-surface-active cursor-pointer transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}