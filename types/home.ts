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
export type TransactionType = "deposit" | "withdrawal";

export interface Transaction {
  beneficiary_bank: any;
  transaction_type: any;
  id: number | string;
  bank: string; // shown in list
  vendor: string; // used on detail screen ("Awash Bank")
  date: string; // human readable for list, e.g. "Feb 15, 2026"
  isoDate: string; // detail screen, e.g. "2026-01-14"
  amount: string; // formatted string "$2.01"
  numericAmount: number; // for any future calculations
  currency: string; // "$" or "ETB"
  type: TransactionType;
  status: string;
  category: string; // "Shopping"
  receiptImage: string; // require(...) or URL later
  messageContextTitle: string;
  messageContextBody: string;
  notes: string;
}

export interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
  scrollEnabled?: boolean;
}
