// types/transaction.type.ts

export interface TransactionData {
  transaction_time: string;
  amount: number; // always a number — never a formatted string
  sender_name: string;
  sender_account: string | null;
  beneficiary_name: string | null;
  beneficiary_account: string | null;
  beneficiary_bank: string | null;
  transaction_type: string; // validated before leaving GeminiService
}
