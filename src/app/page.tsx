"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <div className="mt-4 text-lg font-medium text-gray-900">Expense Tracker</div>
        <div className="mt-2 text-sm text-gray-600">Loading your dashboard...</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!loading && !redirecting) {
      setRedirecting(true);
      
      // Use requestIdleCallback for non-critical redirects
      const redirect = () => {
        if (user || (token && !isOnline)) {
          router.replace("/expenses");
        } else {
          router.replace("/login");
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(redirect);
      } else {
        setTimeout(redirect, 0);
      }
    }
  }, [user, loading, token, isOnline, router, redirecting]);

  return <LoadingSkeleton />;
}
