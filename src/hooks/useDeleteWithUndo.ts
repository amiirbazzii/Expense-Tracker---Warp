import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useDeleteWithUndo<T extends { _id: string }>(
  deleteFn: (id: string) => Promise<boolean>,
  label: string,
) {
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  const deleteWithUndo = useCallback(
    (id: string) => {
      setPendingDeletions((prev) => [...prev, id]);

      const toastId = toast.success(`${label} deleted`, {
        action: {
          label: "Undo",
          onClick: () => {
            setPendingDeletions((prev) => prev.filter((p) => p !== id));
            toast.dismiss(toastId);
          },
        },
        onAutoClose: async () => {
          try {
            await deleteFn(id);
          } catch {
            toast.error(`Failed to delete ${label.toLowerCase()}.`);
            setPendingDeletions((prev) => prev.filter((p) => p !== id));
          }
        },
        duration: 5000,
      });
    },
    [deleteFn, label],
  );

  const filterPending = useCallback(
    (items: T[]) =>
      items.filter((item) => !pendingDeletions.includes(item._id)),
    [pendingDeletions],
  );

  return { pendingDeletions, deleteWithUndo, filterPending };
}
