// types/home.ts

export interface Category {
  id: string;
  name: string;
}

export interface DateRangeOption {
  id: string;
  label: string;
}

// --- Interfaces ---
export interface Transaction {
  id: number | string;
  bank: string;
  date: string;
  amount: string;
  type: "deposit" | "withdrawal";
  status: string;
}

export interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
}
