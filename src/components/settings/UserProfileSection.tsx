"use client";

import { User } from "lucide-react";

interface UserProfileSectionProps {
  username?: string;
}

export function UserProfileSection({ username }: UserProfileSectionProps) {
  return (
    <div className="flex items-center space-x-4 mb-6">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
        <User className="text-blue-600" size={32} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{username}</h2>
        <p className="text-sm text-gray-600">Expense Tracker User</p>
      </div>
    </div>
  );
}
