export interface TransactionData {
  transaction_time: string; // ISO 8601 — required
  amount: number; // required
  sender_name: string; // required
  sender_account: string | null;
  beneficiary_name: string | null;
  beneficiary_account: string | null;
  beneficiary_bank: string | null;
  transaction_type: string; // required — e.g. "sms", "bank_transfer"
}
