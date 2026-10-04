"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import { CreditCard, Calendar, Trash2, Edit } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { DropdownMenu } from "@/components/DropdownMenu";

interface IncomeCardProps {
  income: Doc<"income">;
  cardName: string;
  onDelete: (incomeId: Id<"income">) => void;
  status?: "pending" | "failed";
  onRetry?: (itemId: string) => void;
  onEdit?: (id: string) => void;
  hideTags?: boolean;
}

export function IncomeCard({
  income,
  cardName,
  onDelete,
  status,
  onRetry,
  onEdit,
  hideTags,
}: IncomeCardProps) {
  const { token } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasNotes =
    typeof income.notes === "string" && income.notes.trim().length > 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(income._id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(income._id);
    } else {
      router.push(`/income/edit?id=${income._id}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative cursor-pointer rounded-lg bg-surface-raised border border-border-subtle shadow-neumo p-3"
      onClick={() => setIsMenuOpen(!isMenuOpen)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title row with price at the end */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="text-base leading-6 font-semibold text-ink-primary truncate pr-2">
                {income.source}
              </h3>
              {status && (
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${status === "pending"
                      ? "bg-sync-syncing/20 text-sync-syncing"
                      : "bg-danger-surface text-danger-text"
                    }`}
                >
                  {status}
                </span>
              )}
            </div>
            <p className="text-[16px] leading-5 font-semibold text-sync-synced whitespace-nowrap">
              +
              {settings
                ? formatCurrency(income.amount, settings.currency)
                : income.amount.toFixed(2)}
            </p>
          </div>
          {/* Info row */}
          <div className="mt-1.5 flex items-center gap-4 text-[13px] leading-5 text-ink-secondary">
            <span className="inline-flex items-center min-w-0">
              <CreditCard className="w-[14px] h-[14px] mr-1.5 text-ink-tertiary" />
              <span className="truncate">{cardName}</span>
            </span>
            <span className="inline-flex items-center">
              <Calendar className="w-[14px] h-[14px] mr-1.5 text-ink-tertiary" />
              <span>
                {settings
                  ? formatDate(income.date, settings.calendar, "yyyy ,d MMM")
                  : new Date(income.date).toLocaleDateString()}
              </span>
            </span>
          </div>
          {/* Divider above tags */}
          {!hideTags && (
            <>
              <div className="mt-2 -mx-4 h-px bg-border-subtle" />
              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.isArray((income as any).category)
                  ? (income as any).category.map((cat: string) => (
                    <span
                      key={cat}
                      className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-surface-sunken text-ink-secondary"
                    >
                      {cat}
                    </span>
                  ))
                  : income.category && (
                    <span className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-surface-sunken text-ink-secondary">
                      {income.category as unknown as string}
                    </span>
                  )}
              </div>
            </>
          )}
          {/* Notes (optional) */}
          {hasNotes && (
            <>
              {/* Divider above note */}
              <div className="mt-3 -mx-4 h-px bg-border-subtle" />
              <p className="mt-3 text-[13px] leading-5 text-ink-tertiary truncate">
                {income.notes}
              </p>
            </>
          )}
        </div>
      </div>
      <DropdownMenu isOpen={isMenuOpen}>
        {status === "failed" && onRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry(income._id);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-ink-link hover:bg-surface-hover text-left"
          >
            <svg
              className="w-3.5 h-3.5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry Sync
          </button>
        )}
        {/* Pending rows stay editable offline; only rejected rows lose Edit. */}
        {status !== "failed" && (
          <button
            onClick={handleEdit}
            className="flex items-center w-full px-4 py-2 text-sm text-ink-primary hover:bg-surface-hover text-left"
          >
            <Edit size={14} className="mr-2" />
            Edit
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex items-center w-full px-4 py-2 text-sm text-danger-text hover:bg-surface-hover text-left"
        >
          <Trash2 size={14} className="mr-2" />
          Delete
        </button>
      </DropdownMenu>
    </motion.div>
  );
}
