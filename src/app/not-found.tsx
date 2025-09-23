"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Check if this is a legitimate 404 or a cache/routing issue
    const currentPath = window.location.pathname;
    console.log('404 error for path:', currentPath);
    
    // For known routes that should exist, try to reload first
    const knownRoutes = ['/settings', '/expenses', '/income', '/dashboard', '/cards'];
    const isKnownRoute = knownRoutes.some(route => currentPath.startsWith(route));
    
    const timer = setTimeout(() => {
      if (isKnownRoute && currentPath !== '/') {
        console.log('Not found: Known route, attempting reload:', currentPath);
        window.location.reload();
      } else {
        console.log('Not found: Unknown route, redirecting to home');
        router.replace('/');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <div className="mt-4 text-lg font-medium text-gray-900">Redirecting...</div>
        <div className="mt-2 text-sm text-gray-600">Taking you to the home page</div>
      </div>
    </div>
  );
}