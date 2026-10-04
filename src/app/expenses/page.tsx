"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExpensesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/add?tab=expense");
  }, [router]);

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center">
      <div className="text-ink-secondary">Redirecting to Add Transaction...</div>
    </div>
  );
}
