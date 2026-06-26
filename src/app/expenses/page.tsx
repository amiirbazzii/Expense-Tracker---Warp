"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExpensesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/add?tab=expense");
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-500">Redirecting to Add Transaction...</div>
    </div>
  );
}
