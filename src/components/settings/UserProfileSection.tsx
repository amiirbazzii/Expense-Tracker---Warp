"use client";

import { User } from "lucide-react";

interface UserProfileSectionProps {
  username?: string;
}

export function UserProfileSection({ username }: UserProfileSectionProps) {
  return (
    <div className="flex flex-col items-center gap-3 w-full mb-6">
      {/* Avatar Container */}
      <div className="bg-surface-sunken rounded-full p-4 flex items-center justify-center shrink-0 w-16 h-16">
        <User className="text-ink-secondary" size={32} />
      </div>
      {/* Name and Role Container */}
      <div className="text-center w-full">
        <h2 className="font-medium text-[24px] text-ink-primary leading-none">
          {username || "User"}
        </h2>
        <p className="font-normal text-ink-secondary text-[14px] mt-1">
          Spendly user
        </p>
      </div>
    </div>
  );
}

