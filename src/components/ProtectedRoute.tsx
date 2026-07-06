"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (loading || hasRedirected) {
      return;
    }

    // If we have a user or a token, allow access — offline is fully supported
    if (user || token) {
      return;
    }

    // No authentication available — redirect to login
    setHasRedirected(true);
    router.replace("/login");
  }, [user, loading, router, token, hasRedirected]);

  // Show loading only while auth is still resolving
  if (loading) {
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

  // Allow access if authenticated or has a token (offline-ready)
  if (user || token) {
    return <>{children}</>;
  }

  // Redirect is in progress
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
