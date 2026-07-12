/**
 * LocalDataStore — Reactive in-memory cache backed by IndexedDB.
 *
 * This is the single source of truth for the UI. Components read exclusively
 * from here via `useLocalData()`. Every write goes to IndexedDB first, then
 * the corresponding Convex mutation is enqueued via `MutationQueueManager`.
 *
 * Data is exposed in the Convex document shape (e.g. `_id`, `_creationTime`)
 * so UI components need no changes — they just read from a local source.
 */

import { LocalStorageManager } from "../storage/LocalStorageManager";
import { MutationQueueManager } from "../queue/MutationQueueManager";

// ── Public types ────────────────────────────────────────────────────────

/** Shape of an expense as the UI expects it (mirrors the Convex document). */
export interface ExpenseDoc {
  _id: string;
  _creationTime: number;
  userId: string;
  amount: number;
  title: string;
  category: string[];
  for: string[];
  date: number;
  cardId?: string;
}

/** Shape of an income record as the UI expects it (mirrors the Convex document). */
export interface IncomeDoc {
  _id: string;
  _creationTime: number;
  userId: string;
  amount: number;
  cardId: string;
  date: number;
  source: string;
  category: string;
  notes?: string;
}

/** Shape of a card with computed balances (mirrors `getCardBalances`). */
export interface CardDoc {
  cardId: string;
  cardName: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

/** Raw card record (name only — balances are computed). */
export interface CardRecord {
  _id: string;
  _creationTime: number;
  userId: string;
  name: string;
}

/** Category string list as the UI expects it (mirrors `getCategories`). */
export interface CategoryDoc {
  _id: string;
  name: string;
  type?: "expense" | "income";
}

/** For-value string list as the UI expects it (mirrors `getForValues`). */
export interface ForValueDoc {
  _id: string;
  value: string;
}

/** Loan document as the UI expects it (mirrors the Convex document). */
export interface LoanDoc {
  _id: string;
  _creationTime: number;
  name: string;
  totalAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  monthlyPaymentDay: number;
  startMonth: number;
  startYear: number;
  userId: string;
  createdAt: number;
}

export interface LocalDataSnapshot {
  expenses: ExpenseDoc[];
  income: IncomeDoc[];
  categories: CategoryDoc[];
  forValues: ForValueDoc[];
  cards: CardDoc[];
  loans: LoanDoc[];
}

const EMPTY_SNAPSHOT: LocalDataSnapshot = {
  expenses: [],
  income: [],
  categories: [],
  forValues: [],
  cards: [],
  loans: [],
};

// ── Store ───────────────────────────────────────────────────────────────

export class LocalDataStore {
  private storage = new LocalStorageManager();
  private queue = new MutationQueueManager();
  private snapshot: LocalDataSnapshot = EMPTY_SNAPSHOT;
  private listeners = new Set<() => void>();
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private userId: string | null = null;

  /** Load all collections from IndexedDB into memory. Safe to call repeatedly. */
  async init(userId: string): Promise<void> {
    this.userId = userId;
    if (this.initializing) return this.initializing;
    if (this.initialized && this.userId === userId) return Promise.resolve();

    this.initializing = (async () => {
      try {
        await this.storage.initialize(userId);
        await this.refresh();
        this.initialized = true;
      } finally {
        this.initializing = null;
      }
    })();

    return this.initializing;
  }

  /**
   * Deduplicate records where both a local_* entry and a hydrated cloud entry
   * exist for the same logical entity. Always prefers the cloud entry; among
   * equals, the record with the higher updatedAt wins (Last-Write-Wins).
   */
  private deduplicateEntities<T extends { id: string; cloudId?: string; updatedAt?: number }>(
    entities: T[],
  ): T[] {
    const byCloudId = new Map<string, T[]>();
    const noCloudId: T[] = [];

    for (const entity of entities) {
      if (!entity.cloudId) {
        noCloudId.push(entity);
      } else {
        const existing = byCloudId.get(entity.cloudId);
        if (existing) {
          existing.push(entity);
        } else {
          byCloudId.set(entity.cloudId, [entity]);
        }
      }
    }

    const deduped: T[] = [...noCloudId];

    for (const group of Array.from(byCloudId.values())) {
      if (group.length === 1) {
        deduped.push(group[0]);
      } else {
        // Multiple records mapping to the same cloud ID — pick the best one.
        // Priority: non-local (hydrated) over local_ entries; then highest updatedAt.
        const sorted = group.sort((a: T, b: T) => {
          const aIsLocal = a.id.startsWith("local_");
          const bIsLocal = b.id.startsWith("local_");
          if (aIsLocal !== bIsLocal) return aIsLocal ? 1 : -1;
          return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        });
        deduped.push(sorted[0]);
      }
    }

    return deduped;
  }

  /** Re-read every collection from IndexedDB and emit a change event. */
  async refresh(): Promise<void> {
    const [
      expenses,
      income,
      categories,
      forValues,
      cards,
      incomeCategories,
      loans,
    ] = await Promise.all([
      this.storage.getExpenses(),
      this.storage.getIncome(),
      this.storage.getCategories(),
      this.storage.getForValues(),
      this.storage.getCards(),
      this.storage.getIncomeCategories(),
      this.storage.getLoans(),
    ]);

    // Deduplicate: when a local_* record and a hydrated cloud record share
    // the same logical entity, keep only the cloud record (LWW by updatedAt).
    const dedupedExpenses = this.deduplicateEntities(expenses);
    const dedupedIncome = this.deduplicateEntities(income);
    const dedupedCategories = this.deduplicateEntities(categories);
    const dedupedForValues = this.deduplicateEntities(forValues);
    const dedupedCards = this.deduplicateEntities(cards);
    const dedupedIncomeCategories = this.deduplicateEntities(incomeCategories);
    const dedupedLoans = this.deduplicateEntities(loans);

    this.snapshot = {
      expenses: dedupedExpenses.map(this.toExpenseDoc),
      income: dedupedIncome.map(this.toIncomeDoc),
      categories: [
        ...dedupedCategories.map(this.toCategoryDoc),
        ...dedupedIncomeCategories.map((c) => ({
          ...this.toCategoryDoc(c),
          type: "income" as const,
        })),
      ],
      forValues: dedupedForValues.map(this.toForValueDoc),
      cards: this.computeCardBalances(dedupedCards, dedupedIncome, dedupedExpenses),
      loans: dedupedLoans.map(this.toLoanDoc),
    };

    this.emit();
  }

  // ── Snapshot / subscription ────────────────────────────────────────────

  getSnapshot = (): LocalDataSnapshot => this.snapshot;

  isInitialized = (): boolean => this.initialized;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  // ── Expense writes ─────────────────────────────────────────────────────

  async addExpense(data: {
    amount: number;
    title: string;
    category: string[];
    for: string[];
    date: number;
    cardId?: string;
  }): Promise<ExpenseDoc> {
    const saved = await this.storage.saveExpense({
      ...data,
      for: data.for,
    });

    await this.queue.enqueue("expenses:createExpense", {
      token: this.userId,
      __localId: saved.id,
      amount: saved.amount,
      title: saved.title,
      category: saved.category,
      for: saved.for,
      date: saved.date,
      cardId: saved.cardId,
    });

    await this.refresh();
    return this.toExpenseDoc(saved);
  }

  async updateExpense(
    id: string,
    updates: {
      amount: number;
      title: string;
      category: string[];
      for: string[];
      date: number;
      cardId?: string;
    },
  ): Promise<ExpenseDoc | null> {
    const updated = await this.storage.updateExpense(id, updates);
    if (!updated) return null;

    await this.queue.enqueue("expenses:updateExpense", {
      token: this.userId,
      expenseId: id,
      amount: updated.amount,
      title: updated.title,
      category: updated.category,
      for: updated.for,
      date: updated.date,
      cardId: updated.cardId,
    });

    await this.refresh();
    return this.toExpenseDoc(updated);
  }

  async deleteExpense(id: string): Promise<boolean> {
    const deleted = await this.storage.deleteExpense(id);
    if (!deleted) return false;

    await this.queue.enqueue("expenses:deleteExpense", {
      token: this.userId,
      expenseId: id,
    });

    await this.refresh();
    return true;
  }

  // ── Income writes ──────────────────────────────────────────────────────

  async addIncome(data: {
    amount: number;
    cardId: string;
    date: number;
    source: string;
    category: string;
    notes?: string;
  }): Promise<IncomeDoc> {
    const saved = await this.storage.saveIncome(data);

    await this.queue.enqueue("income:createIncome", {
      token: this.userId,
      __localId: saved.id,
      amount: saved.amount,
      cardId: saved.cardId,
      date: saved.date,
      source: saved.source,
      category: saved.category,
      notes: saved.notes,
    });

    await this.refresh();
    return this.toIncomeDoc(saved);
  }

  async updateIncome(
    id: string,
    updates: {
      amount: number;
      source: string;
      category: string;
      date: number;
      cardId: string;
      notes?: string;
    },
  ): Promise<IncomeDoc | null> {
    const updated = await this.storage.updateIncome(id, updates);
    if (!updated) return null;

    await this.queue.enqueue("income:updateIncome", {
      token: this.userId,
      incomeId: id,
      amount: updated.amount,
      source: updated.source,
      category: updated.category,
      date: updated.date,
      cardId: updated.cardId,
      notes: updated.notes,
    });

    await this.refresh();
    return this.toIncomeDoc(updated);
  }

  async deleteIncome(id: string): Promise<boolean> {
    const deleted = await this.storage.deleteIncome(id);
    if (!deleted) return false;

    await this.queue.enqueue("income:deleteIncome", {
      token: this.userId,
      incomeId: id,
    });

    await this.refresh();
    return true;
  }

  // ── Card writes ────────────────────────────────────────────────────────

  async addCard(name: string): Promise<CardRecord> {
    const saved = await this.storage.saveCard({ name });

    await this.queue.enqueue("cards:addCard", {
      token: this.userId,
      name: saved.name,
      __localId: saved.id,
    });

    await this.refresh();
    return {
      _id: saved.id,
      _creationTime: saved.createdAt,
      userId: this.userId ?? "",
      name: saved.name,
    };
  }

  async deleteCard(id: string): Promise<boolean> {
    const deleted = await this.storage.deleteCard(id);
    if (!deleted) return false;

    await this.queue.enqueue("cards:deleteCard", {
      token: this.userId,
      cardId: id,
    });

    await this.refresh();
    return true;
  }

  // ── Category / ForValue writes ─────────────────────────────────────────

  async addCategory(
    name: string,
    type: "expense" | "income" = "expense",
  ): Promise<CategoryDoc> {
    const saved =
      type === "income"
        ? await this.storage.saveIncomeCategory({ name })
        : await this.storage.saveCategory({ name });

    await this.queue.enqueue("expenses:createCategory", {
      token: this.userId,
      name: saved.name,
    });

    await this.refresh();
    return this.toCategoryDoc(saved);
  }

  async addForValue(value: string): Promise<ForValueDoc> {
    const saved = await this.storage.saveForValue({ value });

    await this.queue.enqueue("expenses:createForValue", {
      token: this.userId,
      value: saved.value,
    });

    await this.refresh();
    return this.toForValueDoc(saved);
  }

  // ── Loan writes ────────────────────────────────────────────────────────

  async createLoan(data: {
    name: string;
    totalAmount: number;
    totalInstallments: number;
    paidInstallments: number;
    installmentAmount: number;
    monthlyPaymentDay: number;
    startMonth: number;
    startYear: number;
  }): Promise<LoanDoc> {
    const saved = await this.storage.saveLoan(data);

    await this.queue.enqueue("loans:createLoan", {
      token: this.userId,
      __localId: saved.id,
      ...data,
    });

    await this.refresh();
    return this.toLoanDoc(saved);
  }

  async updateLoan(
    id: string,
    data: {
      name: string;
      totalAmount: number;
      totalInstallments: number;
      paidInstallments: number;
      installmentAmount: number;
      monthlyPaymentDay: number;
      startMonth: number;
      startYear: number;
    },
  ): Promise<LoanDoc | null> {
    const updated = await this.storage.updateLoan(id, data);
    if (!updated) return null;

    await this.queue.enqueue("loans:updateLoan", {
      token: this.userId,
      loanId: id,
      ...data,
    });

    await this.refresh();
    return this.toLoanDoc(updated);
  }

  async deleteLoan(id: string): Promise<boolean> {
    const deleted = await this.storage.deleteLoan(id);
    if (!deleted) return false;

    await this.queue.enqueue("loans:deleteLoan", {
      token: this.userId,
      loanId: id,
    });

    await this.refresh();
    return true;
  }

  /** Increment paid installments and enqueue the cloud mutation. */
  async payInstallment(loanId: string): Promise<LoanDoc | null> {
    const loans = await this.storage.getLoans();
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return null;

    const updated = await this.storage.updateLoan(loanId, {
      paidInstallments: loan.paidInstallments + 1,
    });
    if (!updated) return null;

    await this.queue.enqueue("loans:payInstallment", {
      token: this.userId,
      loanId,
    });

    await this.refresh();
    return this.toLoanDoc(updated);
  }

  // ── Shape mappers (local entity → Convex document shape) ──────────────

  private toExpenseDoc = (e: any): ExpenseDoc => ({
    _id: e.cloudId || e.id,
    _creationTime: e.createdAt,
    userId: this.userId ?? "",
    amount: e.amount,
    title: e.title,
    category: e.category,
    for: e.for,
    date: e.date,
    cardId: e.cardId,
  });

  private toIncomeDoc = (i: any): IncomeDoc => ({
    _id: i.cloudId || i.id,
    _creationTime: i.createdAt,
    userId: this.userId ?? "",
    amount: i.amount,
    cardId: i.cardId,
    date: i.date,
    source: i.source,
    category: i.category,
    notes: i.notes,
  });

  private toCategoryDoc = (c: any): CategoryDoc => ({
    _id: c.cloudId || c.id,
    name: c.name,
    type: c.type,
  });

  private toForValueDoc = (f: any): ForValueDoc => ({
    _id: f.cloudId || f.id,
    value: f.value,
  });

  private toLoanDoc = (l: any): LoanDoc => ({
    _id: l.cloudId || l.id,
    _creationTime: l.createdAt,
    name: l.name,
    totalAmount: l.totalAmount,
    totalInstallments: l.totalInstallments,
    paidInstallments: l.paidInstallments,
    installmentAmount: l.installmentAmount,
    monthlyPaymentDay: l.monthlyPaymentDay,
    startMonth: l.startMonth,
    startYear: l.startYear,
    userId: this.userId ?? "",
    createdAt: l.createdAt,
  });

  /**
   * Compute card balances locally — mirrors the Convex `getCardBalances`
   * handler so the UI sees the same shape from either source.
   */
  private computeCardBalances(
    cards: any[],
    income: any[],
    expenses: any[],
  ): CardDoc[] {
    return cards.map((card) => {
      const cardId = card.cloudId || card.id;
      const cardIncome = income
        .filter((inc) => inc.cardId === cardId)
        .reduce((sum, inc) => sum + inc.amount, 0);

      const cardExpenses = expenses
        .filter((exp) => exp.cardId === cardId)
        .reduce((sum, exp) => sum + exp.amount, 0);

      return {
        cardId,
        cardName: card.name,
        totalIncome: cardIncome,
        totalExpenses: cardExpenses,
        balance: cardIncome - cardExpenses,
      };
    });
  }
}

/** Singleton — the single source of truth for local-first UI reads. */
export const localDataStore = new LocalDataStore();
