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
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left cursor-pointer"
    >
      <div className="flex items-center space-x-3">
        <Icon className="text-ink-secondary shrink-0" size={24} />
        <div className="flex flex-col">
          <div className="font-medium text-[16px] text-ink-primary leading-tight">
            {title}
          </div>
          <div className="font-normal text-[12px] text-ink-secondary mt-0.5">
            {description}
          </div>
        </div>
      </div>
      <Download className="text-ink-primary shrink-0" size={24} />
    </button>
  );
}

