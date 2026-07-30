"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "./FullScreenLoader";

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

  // Rendering children while authentication is still resolving shows the
  // signed-in UI to a signed-out visitor for a frame before the redirect.
  if (loading) return <FullScreenLoader />;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
