"use client";

import { format } from "date-fns";
import { Briefcase, Tag } from "lucide-react";
import { SmartSelectInput } from "@/components/SmartSelectInput";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/Button";
import InputContainer from "@/components/InputContainer";
import { CardSelect } from "@/components/add/CardSelect";

interface IncomeFormFieldsProps {
  form: {
    amount: string;
    source: string;
    category: string[];
    date: Date;
    cardId: string;
    notes: string;
  };
  setField: (key: string, value: unknown) => void;
  onDateChange: (dateString: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  activeCards: { _id: string; name: string }[];
  catSuggestions: (query: string) => Promise<string[]>;
  submitLabel: string;
}

export function IncomeFormFields({
  form,
  setField,
  onDateChange,
  onSubmit,
  isSubmitting,
  activeCards,
  catSuggestions,
  submitLabel,
}: IncomeFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <CurrencyInput
        value={form.amount}
        onChangeValue={(v) => setField("amount", v)}
        required
      />
      <InputContainer leftIcon={Briefcase}>
        <input
          type="text"
          value={form.source}
          onChange={(e) => setField("source", e.target.value)}
          className={`w-full bg-transparent outline-none placeholder:text-gray-500 ${form.source ? 'font-medium text-gray-900' : 'font-normal text-gray-900'}`}
          placeholder="Salary, Freelance, etc."
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
        label="Category *"
        multiple={false}
        value={form.category}
        onChange={(v) => setField("category", v)}
        fetchSuggestions={catSuggestions}
        placeholder="Select or add a category"
      />
      <CustomDatePicker
        label="Date *"
        value={format(form.date, "yyyy-MM-dd")}
        onChange={onDateChange}
      />
      <div className="rounded-[10px] border border-[#D3D3D3] bg-[#f8f8f8] focus-within:border-black focus-within:shadow-[inset_0px_0px_0px_1px_#000]">
        <div className="px-4 py-3">
          <textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className={`w-full bg-transparent outline-none placeholder:text-gray-500 resize-none min-h-[88px] text-sm ${form.notes ? "font-medium text-gray-900" : "font-normal text-gray-900"}`}
            placeholder="Notes (Optional)"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={isSubmitting || form.category.length === 0 || !form.cardId}
        loading={isSubmitting}
        className="w-full min-h-[44px]"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
