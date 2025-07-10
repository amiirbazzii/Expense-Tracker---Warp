import { motion } from "framer-motion";
import { Pencil } from "lucide-react";

interface ExpenseActionMenuProps {
  onEdit: () => void;
}

export function ExpenseActionMenu({ onEdit }: ExpenseActionMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 top-full"
      onClick={(e) => e.stopPropagation()} // Prevent card click from closing menu immediately
    >
      <div className="py-1">
        <button
          onClick={onEdit}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 gap-2"
        >
          <Pencil className="mr-3 h-4 w-4" />
          Edit
        </button>

      </div>
    </motion.div>
  );
}
