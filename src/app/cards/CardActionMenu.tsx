import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

export function CardActionMenu({ onDelete }: { onDelete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 top-full border border-gray-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        <button
          onClick={onDelete}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </motion.div>
  );
}
