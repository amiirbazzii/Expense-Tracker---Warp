"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { navigateToStartupShell } from "@/lib/pwa/coreRoutes";

export default function Home() {
  const { user, loading, token } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    // Ceiling before we stop waiting for auth and go to /login. Offline auth
    // resolves from IndexedDB in milliseconds; 5s just meant five seconds of
    // splash on a bad connection.
    const timeoutId = setTimeout(() => {
      setTimeoutReached(true);
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (timeoutReached && !redirecting) {
      setRedirecting(true);
      navigateToStartupShell("/login");
      return;
    }

    if ((!loading || timeoutReached) && !redirecting) {
      setRedirecting(true);
      const redirect = () => {
        if (user || token) {
          navigateToStartupShell("/add");
        } else {
          navigateToStartupShell("/login");
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(redirect);
      } else {
        setTimeout(redirect, 100);
      }
    }
  }, [user, loading, token, redirecting, timeoutReached]);

  // Visible boot state — this page is the PWA start_url and the first paint
  // of every cold start; a bare white div read as a broken app.
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="Spendly" width={64} height={64} className="rounded-xl" />
      <svg
        className="animate-spin text-gray-400"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21 12a9 9 0 1 1-6.219-8.56"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
