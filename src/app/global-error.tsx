"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error for debugging
    console.error('Global error caught:', error);
    if (typeof window !== 'undefined') {
      console.log('Current pathname when error occurred:', window.location.pathname);
    }
    
    // Don't auto-redirect on global errors to prevent redirect loops
    // Let the user stay on the current page and handle the error gracefully
  }, [error, router]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-surface-page flex items-center justify-center">
          <div className="text-center">
            <div className="text-danger mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="mt-4 text-lg font-medium text-ink-primary">Application Error</div>
            <div className="mt-2 text-sm text-ink-secondary">Something went wrong. Please refresh the page.</div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover cursor-pointer transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}