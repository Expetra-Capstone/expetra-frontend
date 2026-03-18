// services/smsParser.ts

import { TransactionPayload } from "./apiService";

// ─── Raw SMS shape from react-native-get-sms-android ─────────────────────────
export interface RawSms {
  _id: string;
  address: string; // sender name or short-code
  body: string; // full message text
  date: string; // received timestamp in ms (as string)
  date_sent: string;
  read: string; // "0" | "1"
  type: string;
}

// ─── Result of parsing one SMS ────────────────────────────────────────────────
export interface ParsedSms {
  id: string; // = rawSms._id
  address: string; // display sender label
  bankName: string; // resolved bank display name
  date: string; // ISO 8601
  isCredit: boolean; // received money
  rawBody: string; // original text
  payload: TransactionPayload; // ready to POST
}

// ─── Known Ethiopian bank sender identifiers ─────────────────────────────────
const BANK_PATTERNS: { keyword: string; displayName: string }[] = [
  { keyword: "cbebirr", displayName: "CBE Birr" },
  { keyword: "cbe", displayName: "Commercial Bank of Ethiopia" },
  { keyword: "8397", displayName: "Commercial Bank of Ethiopia" },
  { keyword: "telebirr", displayName: "Telebirr" },
  { keyword: "awash", displayName: "Awash Bank" },
  { keyword: "dashen", displayName: "Dashen Bank" },
  { keyword: "abyssinia", displayName: "Abyssinia Bank" },
  { keyword: "boa", displayName: "Bank of Abyssinia" },
  { keyword: "hellocash", displayName: "HelloCash" },
  { keyword: "mpesa", displayName: "M-Pesa" },
  { keyword: "m-pesa", displayName: "M-Pesa" },
  { keyword: "wegagen", displayName: "Wegagen Bank" },
  { keyword: "127", displayName: "Ethio Telecom" },
  { keyword: "amole", displayName: "Amole" },
  { keyword: "nib", displayName: "NIB International Bank" },
  { keyword: "bunna", displayName: "Bunna Bank" },
  { keyword: "enat", displayName: "Enat Bank" },
  { keyword: "zemen", displayName: "Zemen Bank" },
  { keyword: "oromia", displayName: "Cooperative Bank of Oromia" },
  { keyword: "cbo", displayName: "Cooperative Bank of Oromia" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isBankSms(address: string, body: string): boolean {
  const combined = (address + " " + body).toLowerCase();
  return BANK_PATTERNS.some((p) => combined.includes(p.keyword));
}

function resolveBankName(address: string, body: string): string {
  const combined = (address + " " + body).toLowerCase();
  const match = BANK_PATTERNS.find((p) => combined.includes(p.keyword));
  return match?.displayName ?? address;
}

function extractAmount(text: string): number | null {
  const patterns = [
    // "ETB 5,000.00" or "ETB5000"
    /ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "5,000.00 ETB"
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*ETB/i,
    // "Birr 500" or "birr500"
    /Birr\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "amount of 500" / "amount: 500"
    /amount[^0-9]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "credited/debited 500"
    /(?:credited|debited|sent|received)\s+(?:with\s+)?(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function extractSenderName(body: string, address: string): string {
  const patterns = [
    /from\s+([A-Z][A-Za-z\s\.]{2,35?})(?:\s+(?:on|at|has|to)|\.|,)/,
    /sender[:\s]+([A-Z][A-Za-z\s\.]{2,35?})(?:\s+(?:on|at)|\.|,)/i,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return address;
}

function extractBeneficiaryName(body: string): string {
  const patterns = [
    /to\s+([A-Z][A-Za-z\s\.]{2,35?})(?:\s+(?:on|at|has|for)|\.|,)/,
    /(?:recipient|receiver)[:\s]+([A-Z][A-Za-z\s\.]{2,35?})(?:\s+(?:on|at)|\.|,)/i,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return "";
}

function extractAccount(body: string): string {
  const patterns = [
    // masked account like "****1234" or "XXXX1234"
    /[*Xx]{2,}\s*(\d{3,8})/,
    // "account 1234567890"
    /(?:account|acct|a\/c)[^\d]*(\d{6,16})/i,
    // standalone 10-16 digit number
    /\b(\d{10,16})\b/,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    if (m?.[1]) return m[1];
  }
  return "";
}

function extractTransactionTime(body: string, dateMs: string): string {
  const patterns = [
    // "2026/03/14 10:30:01" or "2026-03-14 10:30"
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?/,
    // "14/03/2026 10:30"
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/,
    // "14-Mar-2026 10:30"
    /(\d{1,2})[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/i,
    // "14/03/2026" date only
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    if (m) {
      try {
        const d = new Date(m[0].replace(/\//g, "-"));
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch {}
    }
  }
  // Fall back to SMS received timestamp
  const ms = parseInt(dateMs, 10);
  return isNaN(ms) ? new Date().toISOString() : new Date(ms).toISOString();
}

function extractReference(body: string): string {
  const patterns = [
    /(?:Ref(?:erence)?|TxnRef|TransRef|Txn)[.:\s#]+([A-Z0-9]{4,20})/i,
    /(?:Transaction\s+(?:No|Number|ID))[.:\s#]+([A-Z0-9]{4,20})/i,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    if (m?.[1]) return m[1];
  }
  return "";
}

// ─── Main parse function ──────────────────────────────────────────────────────

export function parseSms(sms: RawSms): ParsedSms | null {
  const body = sms.body;

  // Must have a detectable amount
  const amount = extractAmount(body);
  if (!amount) return null;

  const isCredit =
    /credit(?:ed)?|receiv(?:ed?|ing)|deposit(?:ed)?|incoming/i.test(body);
  const isDebit =
    /debit(?:ed)?|sent|transfer(?:red)?|paid|outgoing|withdraw(?:n)?|payment/i.test(
      body,
    );

  // Must clearly be a transaction direction
  if (!isCredit && !isDebit) return null;

  const bankName = resolveBankName(sms.address, body);
  const time = extractTransactionTime(body, sms.date);
  const reference = extractReference(body);

  // For a credit: the bank/sender sent us money; beneficiary is "us"
  // For a debit:  we sent money to someone
  const senderName = isDebit ? bankName : extractSenderName(body, bankName);
  const senderAccount = isDebit ? extractAccount(body) : "";
  const beneficiaryName = isDebit ? extractBeneficiaryName(body) : "";
  const beneficiaryAccount = isDebit ? extractAccount(body) : "";
  const beneficiaryBank = isDebit ? bankName : "";

  const payload: TransactionPayload = {
    transaction_time: time,
    amount,
    sender_name: senderName || bankName,
    sender_account: senderAccount,
    beneficiary_name: beneficiaryName,
    beneficiary_account: beneficiaryAccount,
    beneficiary_bank: beneficiaryBank,
    transaction_type: "sms",
  };

  return {
    id: sms._id,
    address: sms.address,
    bankName,
    date: time,
    isCredit,
    rawBody: body,
    payload,
  };
}

export function parseAllBankSms(messages: RawSms[]): ParsedSms[] {
  return messages
    .filter((sms) => isBankSms(sms.address, sms.body))
    .map(parseSms)
    .filter((p): p is ParsedSms => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
