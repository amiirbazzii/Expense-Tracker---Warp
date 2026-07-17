import { ReactNode } from "react";

interface SettingsCardProps {
  title: string;
  children: ReactNode;
}

export function SettingsCard({ title, children }: SettingsCardProps) {
  return (
    <div className="bg-[#f9f9f9] border border-[#e4e4e4] rounded-[16px] py-2 flex flex-col w-full">
      {/* Title */}
      <div className="flex px-4">
        <p className="font-normal text-[#707070] text-sm text-left">{title}</p>
      </div>

      {/* Divider below title */}
      <div className="w-full border-t border-[#e4e4e4] mt-2 mb-1" />

      {children}
    </div>
  );
}
