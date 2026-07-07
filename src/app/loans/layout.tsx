"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function LoansLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
