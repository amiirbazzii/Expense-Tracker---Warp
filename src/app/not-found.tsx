"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Log 404 for debugging
    console.log('404 error for path:', window?.location?.pathname);
    
    // Don't auto-redirect on 404 to prevent redirect loops
    // Let the user stay and handle the error gracefully
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
        <div className="mt-4 text-lg font-medium text-gray-900">Page Not Found</div>
        <div className="mt-2 text-sm text-gray-600">The page you're looking for doesn't exist.</div>
        <div className="mt-6 space-x-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh Page
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}