"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { X, Calendar, DollarSign, User, ArrowLeft, CheckCircle, CreditCard, PencilLine, Tag } from "lucide-react";
import { HeaderRow } from "@/components/HeaderRow";
import { format } from "date-fns";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter, useParams } from "next/navigation";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";

const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface ExpenseFormData {
  amount: string;
  title: string;
  category: string[];
  for: string[];
  date: string;
  cardId: string;
}

export default function EditExpensePage() {
  const { id } = useParams();
  const router = useRouter();

  const { token } = useAuth();
  const createCategoryMutation = useMutation(api.expenses.createCategory);
  const createForValueMutation = useMutation(api.expenses.createForValue);
  const categories = useQuery(api.expenses.getCategories, token ? { token } : "skip");
  const forValues = useQuery(api.expenses.getForValues, token ? { token } : "skip");
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");

  const fetchCategorySuggestions = async (query: string): Promise<string[]> => {
    if (!categories) return [];
    return categories
      .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
      .map(cat => cat.name);
  };

  const fetchForSuggestions = async (query: string): Promise<string[]> => {
    if (!forValues) return [];
    return forValues
      .filter(f => f.value.toLowerCase().includes(query.toLowerCase()))
      .map(f => f.value);
  };

  const handleCreateCategory = async (name: string): Promise<void> => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    try {
      await createCategoryMutation({ token, name });
      toast.success(`The category "${name}" has been created.`);
    } catch (error) {
      toast.error("There was an error creating the category.");
      console.error(error);
    }
  };

  const handleCreateForValue = async (value: string): Promise<void> => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }
    try {
      await createForValueMutation({ token, value });
      toast.success(`The value "${value}" has been created for the 'For' field.`);
    } catch (error) {
      toast.error("There was an error creating the value for the 'For' field.");
      console.error(error);
    }
  };

  const params = useParams();
  const expenseId = params.id as Id<"expenses">;

  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: "",
    title: "",
    category: [],
    for: [],
    date: format(new Date(), "yyyy-MM-dd"),
    cardId: "",
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [forInput, setForInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const updateExpenseMutation = useMutation(api.expenses.updateExpense);
  const expense = useQuery(api.expenses.getExpenseById, token ? { token, expenseId } : "skip");

  // Load expense data into form when available
  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        title: expense.title,
        category: expense.category,
        for: Array.isArray(expense.for) ? expense.for : (expense.for ? [expense.for] : []),
        date: format(new Date(expense.date), "yyyy-MM-dd"),
        cardId: expense.cardId || "",
      });
      setIsLoading(false);
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.title || formData.category.length === 0) {
      toast.error("Please enter the amount, title, and category.");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateExpenseMutation({
        token: token!,
        expenseId,
        amount,
        title: formData.title,
        category: formData.category,
        for: formData.for,
        date: new Date(formData.date).getTime(),
        cardId: formData.cardId ? (formData.cardId as any) : undefined,
      });

      toast.success("The expense has been successfully updated.");
      router.push("/expenses");
    } catch (error: unknown) {
      toast.error("There was an error updating the expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format category name according to rules:
  // - lowercase
  // - no leading/trailing spaces
  // - hyphens between words
  const formatCategoryName = (name: string): string => {
    return name
      .trim() // Remove leading/trailing spaces
      .toLowerCase() // Convert to lowercase
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const addCategory = (categoryName: string) => {
    const formatted = formatCategoryName(categoryName);
    if (formatted && !formData.category.includes(formatted)) {
      setFormData({
        ...formData,
        category: [...formData.category, formatted],
      });
    }
    setCategoryInput("");
  };

  // Function specifically for selecting from dropdown (no formatting needed)
  const selectCategoryFromDropdown = (categoryName: string) => {
    if (categoryName && !formData.category.includes(categoryName)) {
      setFormData({
        ...formData,
        category: [...formData.category, categoryName],
      });
    }
    setCategoryInput("");
  };

  const removeCategory = (index: number) => {
    setFormData({
      ...formData,
      category: formData.category.filter((_, i) => i !== index),
    });
  };

  const handleCategoryKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCategory(categoryInput);
    }
  };

  // Functions for handling "For" input
  const handleForSelect = (value: string) => {
    if (!formData.for.includes(value)) {
      setFormData({ ...formData, for: [...formData.for, value] });
    }
    setForInput("");
  };

  const handleForKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (forInput.trim()) {
        handleForSelect(forInput.trim());
      }
    }
  };

  const handleForBlur = () => {
    if (forInput.trim()) {
      handleForSelect(forInput.trim());
    }
  };

  const suggestedForValues = forValues?.filter(
    (forValue) =>
      !formData.for.includes(forValue.value) &&
      forValue.value.toLowerCase().includes(forInput.toLowerCase())
  );

  const wouldCreateNewFor = forInput.trim() &&
    !formData.for.includes(forInput.trim()) &&
    !forValues?.some(forValue => forValue.value === forInput.trim());

  const suggestedCategories = categories?.filter(
    (cat) =>
      !formData.category.includes(cat.name) &&
      cat.name.toLowerCase().includes(categoryInput.toLowerCase())
  );

  // Check if the current input would create a new category
  const formattedInput = formatCategoryName(categoryInput);
  const wouldCreateNew = formattedInput && 
    !formData.category.includes(formattedInput) &&
    !categories?.some(cat => cat.name === formattedInput);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <HeaderRow
          left={
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Go Back"
              >
                <ArrowLeft size={20} />
              </motion.button>
              <h1 className="text-xl font-bold text-gray-900">Edit Expense</h1>
            </>
          }
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Edit Expense Details</h2>
              <p className="text-sm text-gray-600">Update the information below</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <CurrencyInput
                  value={formData.amount}
                  onChangeValue={(val) => setFormData({ ...formData, amount: val })}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <InputContainer leftIcon={PencilLine}>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full bg-transparent outline-none placeholder:text-gray-500 ${formData.title ? 'font-medium text-gray-900' : 'font-normal text-gray-900'}`}
                    placeholder="Lunch, Gas, etc."
                    required
                  />
                </InputContainer>
              </div>

              <SmartSelectInput
                icon={Tag}
                name="category"
                label="Categories *"
                multiple
                value={formData.category}
                onChange={(newCategories) => setFormData({ ...formData, category: newCategories })}
                fetchSuggestions={fetchCategorySuggestions}
                onCreateNew={handleCreateCategory}
                formatNewItem={capitalizeWords}
                placeholder="Select or add categories"
              />

              <SmartSelectInput
                icon={User}
                name="for"
                label="For (Optional)"
                multiple={false}
                value={formData.for}
                onChange={(newFor) => setFormData({ ...formData, for: newFor })}
                fetchSuggestions={fetchForSuggestions}
                onCreateNew={handleCreateForValue}
                formatNewItem={capitalizeWords}
                placeholder="Select or add a person"
              />

              {/* Card */}
              <div>
                <InputContainer
                  leftIcon={CreditCard}
                  rightAdornment={(
                    <svg className="size-5 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                >
                  <select
                    value={formData.cardId}
                    onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                    className="w-full bg-transparent outline-none text-black placeholder:text-gray-500 py-1 px-0 appearance-none"
                    required
                  >
                    <option value="" disabled>Select a card</option>
                    {cards?.map(card => (
                      <option key={card._id} value={card._id}>{card.name}</option>
                    ))}
                  </select>
                </InputContainer>
              </div>

              {/* Date */}
              <CustomDatePicker
                label="Date"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
              />

              {/* Submit button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  className="w-full min-h-[44px]"
                >
                  Update Expense
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
