"use client";

import { format } from "date-fns";
import { PencilLine, Tag, User, Settings2 } from "lucide-react";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";
import { CardSelect } from "@/components/add/CardSelect";

interface ExpenseFormFieldsProps {
  form: {
    amount: string;
    title: string;
    category: string[];
    for: string[];
    date: Date;
    cardId: string;
  };
  setField: (key: string, value: unknown) => void;
  onDateChange: (dateString: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  activeCards: { _id: string; name: string }[];
  catSuggestions: (query: string) => Promise<string[]>;
  createCategory: (name: string) => Promise<void>;
  forSuggestions: (query: string) => Promise<string[]>;
  createForValue: (value: string) => Promise<void>;
  submitLabel: string;
  requireCard?: boolean;
  onManageCategories?: () => void;
}

export function ExpenseFormFields({
  form,
  setField,
  onDateChange,
  onSubmit,
  isSubmitting,
  activeCards,
  catSuggestions,
  createCategory,
  forSuggestions,
  createForValue,
  submitLabel,
  requireCard = true,
  onManageCategories,
}: ExpenseFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <CurrencyInput
        value={form.amount}
        onChangeValue={(v) => setField("amount", v)}
        required
      />
      <InputContainer leftIcon={PencilLine}>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          className={`w-full bg-transparent outline-none placeholder:text-gray-500 ${form.title ? 'font-medium text-gray-900' : 'font-normal text-gray-900'}`}
          placeholder="Lunch, Gas, etc."
          required
        />
      </InputContainer>
      <CardSelect
        value={form.cardId}
        cards={activeCards}
        onChange={(v) => setField("cardId", v)}
      />
      <SmartSelectInput
        icon={Tag}
        name="category"
        label="Categories *"
        multiple
        value={form.category}
        onChange={(v) => setField("category", v)}
        fetchSuggestions={catSuggestions}
        onCreateNew={createCategory}
        formatNewItem={capitalizeWords}
        placeholder="Select or add categories"
        rightIcon={
          onManageCategories ? (
            <button
              type="button"
              onClick={onManageCategories}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Manage categories"
            >
              <Settings2 size={16} />
            </button>
          ) : undefined
        }
      />
      <SmartSelectInput
        icon={User}
        name="for"
        label="For (Optional)"
        multiple={false}
        value={form.for}
        onChange={(v) => setField("for", v)}
        fetchSuggestions={forSuggestions}
        onCreateNew={createForValue}
        formatNewItem={capitalizeWords}
        placeholder="Select or add a person"
        rightText="Optional"
      />
      <CustomDatePicker
        label="Date *"
        value={format(form.date, "yyyy-MM-dd")}
        onChange={onDateChange}
      />
      <Button
        type="submit"
        size="medium"
        disabled={
          isSubmitting ||
          form.category.length === 0 ||
          (requireCard && !form.cardId)
        }
        loading={isSubmitting}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  );
}

const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
