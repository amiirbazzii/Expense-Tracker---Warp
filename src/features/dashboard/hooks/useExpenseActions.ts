import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Expense } from "../types";
import { toast } from "sonner";

export function useExpenseActions(token: string | null) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteExpenseMutation = useMutation(api.expenses.deleteExpense);

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowActionModal(true);
  };

  const handleEdit = () => {
    if (!selectedExpense) return;
    setShowActionModal(false);
    // The actual navigation will be handled by the parent component
    return selectedExpense._id;
  };

  const handleDeleteClick = () => {
    setShowActionModal(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedExpense || !token) return false;
    
    setIsDeleting(true);
    try {
      // Ensure the expense ID is properly typed for the Convex mutation
      await deleteExpenseMutation({
        token,
        expenseId: selectedExpense._id as any, // Type assertion needed due to Convex ID type
      });
      toast.success("Expense deleted successfully!");
      setShowDeleteConfirm(false);
      setSelectedExpense(null);
      return true; // Indicate success
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete expense";
      toast.error(message);
      return false; // Indicate failure
    } finally {
      setIsDeleting(false);
    }
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedExpense(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedExpense(null);
  };

  return {
    selectedExpense,
    showActionModal,
    showDeleteConfirm,
    isDeleting,
    handleExpenseClick,
    handleEdit,
    handleDeleteClick,
    confirmDelete,
    closeActionModal,
    cancelDelete,
  };
}
