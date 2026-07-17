import { Download, LucideIcon } from "lucide-react";

interface ExportButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  description: string;
  iconColor?: string;
  bgClass?: string;
  hoverClass?: string;
  borderClass?: string;
}

export function ExportButton({
  icon: Icon,
  onClick,
  disabled = false,
  title,
  description,
}: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left drop-shadow-[0px_3px_2px_rgba(0,0,0,0.03)] cursor-pointer"
    >
      <div className="flex items-center space-x-3">
        <Icon className="text-gray-500 shrink-0" size={24} />
        <div className="flex flex-col">
          <div className="font-medium text-[16px] text-black leading-tight">
            {title}
          </div>
          <div className="font-normal text-[12px] text-[#707070] mt-0.5">
            {description}
          </div>
        </div>
      </div>
      <Download className="text-black shrink-0" size={24} />
    </button>
  );
}

