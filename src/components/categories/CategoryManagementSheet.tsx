"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, ArchiveRestore, Trash2, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { localDataStore, type CategoryDoc } from "@/lib/store/LocalDataStore";
import { toast } from "sonner";

interface CategoryManagementSheetProps {
  open: boolean;
  onClose: () => void;
  type: "expense" | "income";
}

export function CategoryManagementSheet({
  open,
  onClose,
  type,
}: CategoryManagementSheetProps) {
  const [allCategories, setAllCategories] = useState<CategoryDoc[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const loadAllCategories = useCallback(async () => {
    const cats = await localDataStore.getAllCategories();
    setAllCategories(cats.filter((c) => c.type === type));
  }, [type]);

  useEffect(() => {
    if (open) {
      loadAllCategories();
    }
  }, [open, loadAllCategories]);

  const active = allCategories.filter((c) => c.isArchived !== true);
  const archived = allCategories.filter((c) => c.isArchived === true);

  const handleArchive = async (cat: CategoryDoc) => {
    try {
      const usageCount = localDataStore.getCategoryUsageCount(cat.name, type);
      if (!cat.isArchived && usageCount > 0) {
        toast(`Archived "${cat.name}". It will remain in ${usageCount} transaction(s) but won't appear in new entries.`);
      }
      if (cat.isArchived) {
        await localDataStore.unarchiveCategory(cat._id);
        toast.success(`Unarchived "${cat.name}"`);
      } else {
        await localDataStore.archiveCategory(cat._id);
        toast.success(`Archived "${cat.name}"`);
      }
      loadAllCategories();
    } catch (e) {
      toast.error("Failed to update category.");
      console.error(e);
    }
  };

  const handleDelete = async (cat: CategoryDoc) => {
    try {
      await localDataStore.deleteCategory(cat._id);
      toast.success(`Deleted "${cat.name}"`);
      loadAllCategories();
    } catch (e) {
      toast.error("Failed to delete category.");
      console.error(e);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${type === "expense" ? "Expense" : "Income"} Categories`}
    >
      <div className="space-y-1">
        {active.length === 0 && archived.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">
            No categories yet. They are created automatically when you add transactions.
          </p>
        )}

        {active.map((cat) => (
          <CategoryRow
            key={cat._id}
            category={cat}
            type={type}
            onArchive={() => handleArchive(cat)}
            onDelete={() => handleDelete(cat)}
          />
        ))}

        {archived.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setArchivedOpen(!archivedOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>Archived ({archived.length})</span>
              {archivedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <AnimatePresence initial={false}>
              {archivedOpen && (
                <motion.div
                  key="archived-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {archived.map((cat) => (
                    <CategoryRow
                      key={cat._id}
                      category={cat}
                      type={type}
                      onArchive={() => handleArchive(cat)}
                      onDelete={() => handleDelete(cat)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function CategoryRow({
  category,
  type,
  onArchive,
  onDelete,
}: {
  category: CategoryDoc;
  type: "expense" | "income";
  onArchive: () => void;
  onDelete: () => void;
}) {
  const usageCount = localDataStore.getCategoryUsageCount(category.name, type);
  const canDelete = usageCount === 0 && category.isArchived !== true;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
        category.isArchived ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#f0f0f0] shrink-0">
        <Tag size={16} className="text-gray-600" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate block">
          {category.name}
        </span>
        {usageCount > 0 && (
          <span className="text-xs text-gray-400">
            Used in {usageCount} transaction{usageCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onArchive}
          className="p-2 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          aria-label={category.isArchived ? "Unarchive" : "Archive"}
          title={category.isArchived ? "Unarchive" : "Archive"}
        >
          {category.isArchived ? (
            <ArchiveRestore size={16} />
          ) : (
            <Archive size={16} />
          )}
        </button>

        {canDelete && (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Delete"
            title="Delete (not used in any transactions)"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
