// services/smsParser.ts

import { TransactionPayload } from "./apiService";

// ─── Raw SMS shape from react-native-get-sms-android ─────────────────────────
export interface RawSms {
  _id: string;
  address: string;
  body: string;
  date: string;
  date_sent: string;
  read: string;
  type: string;
}

// ─── Result of parsing one SMS ────────────────────────────────────────────────
export interface ParsedSms {
  id: string;
  address: string;
  bankName: string;
  date: string;
  isCredit: boolean;
  rawBody: string;
  payload: TransactionPayload;
}

// ─── Known Ethiopian bank / wallet sender identifiers ────────────────────────
// Each entry is matched against (address + body).toLowerCase().
// Order matters — more specific keywords should come before broader ones
// (e.g. "cbebirr" before "cbe") so the right displayName wins.
const BANK_PATTERNS: { keyword: string; displayName: string }[] = [
  // ── Mobile wallets ──────────────────────────────────────────────────────
  { keyword: "cbebirr", displayName: "CBE Birr" },
  { keyword: "telebirr", displayName: "Telebirr" },
  { keyword: "hellocash", displayName: "HelloCash" },
  { keyword: "mpesa", displayName: "M-Pesa" },
  { keyword: "m-pesa", displayName: "M-Pesa" },
  { keyword: "amole", displayName: "Amole" },

  // ── Short codes used in SMS sender field ────────────────────────────────
  { keyword: "8397", displayName: "Commercial Bank of Ethiopia" },
  // { keyword: "127", displayName: "Ethio Telecom" },
  { keyword: "6370", displayName: "Awash Bank" },
  { keyword: "6261", displayName: "Dashen Bank" },
  { keyword: "8482", displayName: "Hibret Bank" },
  { keyword: "8474", displayName: "Abyssinia Bank" },
  { keyword: "6464", displayName: "Wegagen Bank" },
  { keyword: "6868", displayName: "United Bank" },
  { keyword: "8181", displayName: "Berhan Bank" },
  { keyword: "6767", displayName: "Lion International Bank" },
  { keyword: "8585", displayName: "NIB International Bank" },
  { keyword: "8686", displayName: "Bunna Bank" },
  { keyword: "8787", displayName: "Enat Bank" },
  { keyword: "8383", displayName: "Zemen Bank" },
  { keyword: "8080", displayName: "Cooperative Bank of Oromia" },

  // ── Bank name keywords found in sender address or body ──────────────────
  { keyword: "cbe", displayName: "Commercial Bank of Ethiopia" },
  { keyword: "awash", displayName: "Awash Bank" },
  { keyword: "dashen", displayName: "Dashen Bank" },
  { keyword: "abyssinia", displayName: "Abyssinia Bank" },
  { keyword: "boa", displayName: "Bank of Abyssinia" },
  { keyword: "wegagen", displayName: "Wegagen Bank" },
  { keyword: "hibret", displayName: "Hibret Bank" },
  { keyword: "united", displayName: "United Bank" },
  { keyword: "berhan", displayName: "Berhan Bank" },
  { keyword: "lion", displayName: "Lion International Bank" },
  { keyword: "nib", displayName: "NIB International Bank" },
  { keyword: "bunna", displayName: "Bunna Bank" },
  { keyword: "enat", displayName: "Enat Bank" },
  { keyword: "zemen", displayName: "Zemen Bank" },
  { keyword: "oromia", displayName: "Cooperative Bank of Oromia" },
  { keyword: "cbo", displayName: "Cooperative Bank of Oromia" },
  { keyword: "addis", displayName: "Addis International Bank" },
  { keyword: "global", displayName: "Global Bank Ethiopia" },
  { keyword: "debub", displayName: "Debub Global Bank" },
  { keyword: "gadaa", displayName: "Gadaa Bank" },
  { keyword: "siinqee", displayName: "Siinqee Bank" },
  { keyword: "shabelle", displayName: "Shabelle Bank" },
  { keyword: "hijra", displayName: "Hijra Bank" },
  { keyword: "tsedey", displayName: "Tsedey Bank" },
  { keyword: "goh", displayName: "Goh Betoch Bank" },
  { keyword: "ahadu", displayName: "Ahadu Bank" },
  { keyword: "mizan", displayName: "Mizan-Tepi University Bank" },
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
    /ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*ETB/i,
    /Birr\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /amount[^0-9]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
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
    /[*Xx]{2,}\s*(\d{3,8})/,
    /(?:account|acct|a\/c)[^\d]*(\d{6,16})/i,
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
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/,
    /(\d{1,2})[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/i,
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

  const amount = extractAmount(body);
  if (!amount) return null;

  const isCredit =
    /credit(?:ed)?|receiv(?:ed?|ing)|deposit(?:ed)?|incoming/i.test(body);
  const isDebit =
    /debit(?:ed)?|sent|transfer(?:red)?|paid|outgoing|withdraw(?:n)?|payment/i.test(
      body,
    );

  if (!isCredit && !isDebit) return null;

  const bankName = resolveBankName(sms.address, body);
  const time = extractTransactionTime(body, sms.date);

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
