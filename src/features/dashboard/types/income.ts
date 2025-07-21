export interface Income {
    _id: string;
    _creationTime: number;
    userId: string;
    amount: number;
    category: string;
    date: number;
    notes?: string;
    cardId: string;
  }
