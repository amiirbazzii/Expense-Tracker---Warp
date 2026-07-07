"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTimeoutReached(true);
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (timeoutReached && !redirecting) {
      setRedirecting(true);
      router.replace("/login");
      return;
    }

    if ((!loading || timeoutReached) && !redirecting) {
      setRedirecting(true);
      const redirect = () => {
        if (user || token) {
          router.replace("/add");
        } else {
          router.replace("/login");
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(redirect);
      } else {
        setTimeout(redirect, 100);
      }
    }
  }, [user, loading, token, router, redirecting, timeoutReached]);

  return <div className="min-h-screen bg-white" />;
}
