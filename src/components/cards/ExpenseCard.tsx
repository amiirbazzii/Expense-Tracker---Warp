"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Calendar,
  Trash2,
  Edit,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { DropdownMenu } from "@/components/DropdownMenu";

type ExpenseItem = (
  | Doc<"expenses">
  | Omit<Doc<"expenses">, "_id" | "userId">
) & {
  status?: "pending" | "failed";
  _id: string | Id<"expenses">;
};

interface ExpenseCardProps {
  expense: ExpenseItem;
  cardName: string;
  onDelete: (id: Id<"expenses">) => void;
  onRetry?: (id: string) => void;
  onEdit?: (id: string) => void;
  status?: "pending" | "failed";
  hideTags?: boolean;
}

export function ExpenseCard({
  expense,
  cardName,
  onDelete,
  onRetry,
  onEdit,
  status,
  hideTags,
}: ExpenseCardProps) {
  const { settings } = useSettings();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(expense._id as Id<"expenses">);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(expense._id as string);
    } else {
      router.push(`/expenses/edit?id=${expense._id}`);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetry && typeof expense._id === "string") {
      onRetry(expense._id);
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

  const isOffline = !!status;

  const forText =
    expense.for && expense.for.length > 0
      ? ` for ${expense.for.join(", ")}`
      : "";

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
                {expense.title}
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
            <p className="text-[16px] leading-5 font-semibold text-danger-text whitespace-nowrap">
              -
              {settings
                ? formatCurrency(expense.amount, settings.currency)
                : expense.amount.toFixed(2)}
            </p>
          </div>{" "}
          <div className="mt-1.5 flex items-center gap-4 text-[13px] leading-5 text-ink-secondary">
            <span className="inline-flex items-center min-w-0">
              <CreditCard className="w-[14px] h-[14px] mr-1.5 text-ink-tertiary" />
              <span className="truncate">{cardName}</span>
            </span>
            <span className="inline-flex items-center">
              <Calendar className="w-[14px] h-[14px] mr-1.5 text-ink-tertiary" />
              <span>
                {settings
                  ? formatDate(expense.date, settings.calendar, "yyyy ,d MMM")
                  : new Date(expense.date).toLocaleDateString()}
              </span>
            </span>
          </div>
          {/* Divider: full-bleed horizontally, 8px from info row */}
          {!hideTags && (
            <>
              <div className="mt-2 -mx-4 h-px bg-border-subtle" />
              {/* Tags: 12px below divider */}
              <div className="mt-3 flex flex-wrap gap-2">
                {expense.category.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-surface-sunken text-ink-secondary"
                  >
                    {cat}
                  </span>
                ))}
                {/* Move 'for' items into tags */}
                {Array.isArray(expense.for) &&
                  expense.for.map((f) => (
                    <span
                      key={`for-${String(f)}`}
                      className="px-3 py-1 text-[12px] leading-5 font-medium rounded-lg bg-surface-sunken text-ink-secondary"
                    >
                      {`for ${f}`}
                    </span>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
      <DropdownMenu isOpen={isMenuOpen}>
        {status === "failed" && onRetry && (
          <button
            onClick={handleRetry}
            className="flex items-center w-full px-4 py-2 text-sm text-ink-link hover:bg-surface-hover text-left"
          >
            <RefreshCw size={14} className="mr-2" />
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
