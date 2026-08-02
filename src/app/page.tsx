"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { navigateToStartupShell } from "@/lib/pwa/coreRoutes";

export default function Home() {
  const { user, loading, token } = useAuth();

  useEffect(() => {
    // Keep startup to one transition: wait only for local session restoration,
    // then load the app shell. Server validation continues in AuthProvider.
    if (!loading) {
      navigateToStartupShell(user || token ? "/add" : "/login");
    }
  }, [user, loading, token]);

  // The native/PWA splash owns the visual startup experience. Rendering no
  // additional UI here avoids a second loading screen before the app shell.
  return null;
}
