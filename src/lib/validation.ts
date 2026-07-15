export function validateAmount(value: string): {
  valid: boolean;
  amount: number;
  error?: string;
} {
  if (!value) return { valid: false, amount: 0, error: "Please enter an amount." };
  const amount = parseFloat(value);
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, amount: 0, error: "Please enter a valid amount." };
  }
  return { valid: true, amount };
}

export function validateDate(date: Date): { valid: boolean; error?: string } {
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Please enter a valid date." };
  }
  return { valid: true };
}
