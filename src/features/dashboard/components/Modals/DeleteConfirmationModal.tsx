import { motion } from "framer-motion";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmationModal({ 
  isOpen, 
  onCancel, 
  onConfirm, 
  isDeleting 
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 w-full max-w-sm"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Expense</h3>
          <p className="text-gray-600">
            Are you sure you want to delete this expense? This action cannot be undone.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
