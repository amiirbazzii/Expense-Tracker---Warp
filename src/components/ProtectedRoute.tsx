"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, token } = useAuth();
  const router = useRouter();

  const isAuthenticated = Boolean(user || token);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;
    router.replace("/login");
  }, [isAuthenticated, loading, router]);

  // A restored local token is enough to open the local-first app. Do not put
  // the shell behind a second loader while server validation runs in the
  // background.
  if (loading && !isAuthenticated) return null;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
