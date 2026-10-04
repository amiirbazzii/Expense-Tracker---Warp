import { ReactNode } from "react";

interface SettingsCardProps {
  title: string;
  children: ReactNode;
}

export function SettingsCard({ title, children }: SettingsCardProps) {
  return (
    <div className="bg-surface-app border border-border-subtle rounded-[16px] py-2 flex flex-col w-full">
      {/* Title */}
      <div className="flex px-4">
        <p className="font-normal text-ink-secondary text-sm text-left">{title}</p>
      </div>

      {/* Divider below title */}
      <div className="w-full border-t border-border-subtle mt-2 mb-1" />

      {children}
    </div>
  );
}
