import { motion } from "framer-motion";
import { Edit, Trash2, X } from "lucide-react";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ActionModal({ isOpen, onClose, onEdit, onDelete }: ActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 w-full max-w-sm"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Expense Actions</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onEdit}
            className="w-full flex items-center justify-center py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-h-[44px]"
          >
            <Edit size={16} className="mr-2" />
            Edit Expense
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onDelete}
            className="w-full flex items-center justify-center py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors min-h-[44px]"
          >
            <Trash2 size={16} className="mr-2" />
            Delete Expense
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
