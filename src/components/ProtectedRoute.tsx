"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineCapability } from "@/providers/OfflineFirstProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { canFunctionOffline, isInitialized, isOnline } = useOfflineCapability();
  const router = useRouter();

  useEffect(() => {
    // Only redirect to login if:
    // 1. Not loading
    // 2. No authenticated user
    // 3. Cannot function offline (no local user data)
    if (!loading && !user && isInitialized && !canFunctionOffline) {
      router.replace("/login");
      return;
    }
    
    // If offline but can function with local data, allow access
    if (!user && canFunctionOffline && !isOnline) {
      console.log('ProtectedRoute: Allowing offline access with local data');
      return;
    }
  }, [user, loading, router, canFunctionOffline, isInitialized, isOnline]);

  // Show loading while authentication and offline systems are initializing
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">
            {!isInitialized ? 'Initializing offline capabilities...' : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  // Allow access if user is authenticated OR if offline with local capabilities
  if (user || (canFunctionOffline && !isOnline)) {
    return <>{children}</>;
  }

  // Fallback: no user and no offline capability
  return null;
}
