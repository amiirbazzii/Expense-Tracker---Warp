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
    
    // Try to reload the page first, only redirect to home if that fails
    const timer = setTimeout(() => {
      // Check if we're on a specific page and should stay there
      const currentPath = window.location.pathname;
      if (currentPath && currentPath !== '/' && !currentPath.includes('undefined')) {
        console.log('Global error: Attempting to reload current page:', currentPath);
        window.location.reload();
      } else {
        console.log('Global error: Redirecting to home');
        router.replace('/');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [error, router]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <div className="mt-4 text-lg font-medium text-gray-900">Redirecting...</div>
            <div className="mt-2 text-sm text-gray-600">Taking you to the home page</div>
          </div>
        </div>
      </body>
    </html>
  );
}