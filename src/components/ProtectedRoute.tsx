"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineCapability } from "@/providers/OfflineFirstProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  
  // Use a try-catch for the offline capability hook in case it's not properly initialized
  let offlineState = {
    canFunctionOffline: false,
    isInitialized: false,
    isOnline: true
  };
  
  try {
    offlineState = useOfflineCapability();
  } catch (error) {
    console.warn('ProtectedRoute: OfflineCapability not available, proceeding with online-only mode:', error);
    // If offline provider fails, mark as initialized to prevent blocking
    offlineState.isInitialized = true;
  }
  
  const { canFunctionOffline, isInitialized, isOnline } = offlineState;

  useEffect(() => {
    // Don't redirect while still loading authentication
    // When offline, don't wait for isInitialized - allow access with token
    if (loading || hasRedirected) {
      return;
    }
    
    // When offline, wait for initialization only if we're online
    if (!isOnline && !isInitialized) {
      // Offline and not initialized yet - give it a moment but don't block forever
      const timer = setTimeout(() => {
        console.log('ProtectedRoute: Offline initialization timeout, proceeding anyway');
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    // When online, wait for initialization
    if (isOnline && !isInitialized) {
      return;
    }

    // If we have a user, we're authenticated and good to go
    if (user) {
      return;
    }

    // If offline and we have a token, allow access
    if (!isOnline && token) {
      console.log('ProtectedRoute: Allowing offline access with token');
      return;
    }

    // If offline but can function with local data, allow access
    if (canFunctionOffline && !isOnline) {
      console.log('ProtectedRoute: Allowing offline access with local data');
      return;
    }

    // If we have a token but no user (possible network issue), allow temporary access
    if (token && !user && isOnline) {
      // Give the user query a bit more time to resolve
      const timer = setTimeout(() => {
        if (!user && token) {
          console.log('ProtectedRoute: Token exists but no user after timeout, continuing anyway');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    // No authentication available - redirect to login
    if (!user && !token && !hasRedirected) {
      console.log('ProtectedRoute: No authentication, redirecting to login');
      setHasRedirected(true);
      router.replace("/login");
    }
  }, [user, loading, router, canFunctionOffline, isInitialized, isOnline, token, hasRedirected]);

  // Show loading only when online and still loading auth
  // When offline with a token, skip the loading screen
  if (loading && (isOnline || !token)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <div className="mt-4 text-lg font-medium text-gray-900">Loading...</div>
          <div className="mt-2 text-sm text-gray-600">Initializing your session</div>
        </div>
      </div>
    );
  }

  // Allow access if authenticated or can function offline or have token
  if (user || (canFunctionOffline && !isOnline) || token) {
    return <>{children}</>;
  }

  // If we get here, redirect is in progress
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <div className="mt-4 text-lg font-medium text-gray-900">Redirecting...</div>
        <div className="mt-2 text-sm text-gray-600">Taking you to the login page</div>
      </div>
    </div>
  );
}
