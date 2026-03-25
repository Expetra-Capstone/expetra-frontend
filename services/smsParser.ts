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

// ─── Centralized name normalizer ──────────────────────────────────────────────
// Rules:
//   1. Trim whitespace
//   2. Convert to Title Case  ("JOHN DOE" → "John Doe")
//   3. Keep only the first TWO words so that a 3-part name in one source
//      ("Berhane Tadesse Alemu") matches a 2-part name in another ("Berhane Tadesse"),
//      and a 1-part name ("Berhane") matches the first word of any longer name.
//
// Examples:
//   "NAHOM TEMESGEN RETEBO" → "Nahom Temesgen"
//   "Nahom Temesgen"        → "Nahom Temesgen"  (unchanged)
//   "BEKA TSEGAYE DEBELE"   → "Beka Tsegaye"
//   "Beka Tsegaye"          → "Beka Tsegaye"    (unchanged)
//   "Berhane"               → "Berhane"         (single name preserved)
//   "Yitbarek Andualem"     → "Yitbarek Andualem"
export function normalizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

// ─── Bank identifier patterns ─────────────────────────────────────────────────
const BANK_PATTERNS: { keyword: string; displayName: string }[] = [
  { keyword: "cbebirr", displayName: "CBE Birr" },
  { keyword: "8397", displayName: "Commercial Bank of Ethiopia" },
  { keyword: "6370", displayName: "Awash Bank" },
  { keyword: "cbe", displayName: "Commercial Bank of Ethiopia" },
  { keyword: "awash", displayName: "Awash Bank" },
];

export function isBankSms(address: string, body: string): boolean {
  const combined = (address + " " + body).toLowerCase();
  return BANK_PATTERNS.some((p) => combined.includes(p.keyword));
}

function resolveBankName(address: string, body: string): string {
  const combined = (address + " " + body).toLowerCase();
  const match = BANK_PATTERNS.find((p) => combined.includes(p.keyword));
  return match?.displayName ?? address;
}

// ─── Date / amount helpers ────────────────────────────────────────────────────

function toAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

function buildIso(dateStr: string, timeStr: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(`${dateStr}T${timeStr}Z`).toISOString();
    }
    const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return new Date(
        `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${timeStr}Z`,
      ).toISOString();
    }
  } catch {}
  return new Date().toISOString();
}

function fallbackTime(dateMs: string): string {
  const ms = parseInt(dateMs, 10);
  return isNaN(ms) ? new Date().toISOString() : new Date(ms).toISOString();
}

// ─── AWASH BANK parser ────────────────────────────────────────────────────────

function parseAwashBank(sms: RawSms): ParsedSms | null {
  const body = sms.body;

  // Format 1: same-bank send
  const sentRe =
    /You have sent ETB\s*([\d,]+(?:\.\d{1,2})?)\s+To\s+\((\d+)\)\s+-\s+([A-Z][A-Z\s]+?)\s+by Transaction ID:\s*(\S+).*?Date\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/is;

  const sentMatch = body.match(sentRe);
  if (sentMatch) {
    const [, rawAmt, beneficiaryAcct, beneficiaryName, , dateStr, timeStr] =
      sentMatch;
    const time = buildIso(dateStr, timeStr);

    return {
      id: sms._id,
      address: sms.address,
      bankName: "Awash Bank",
      date: time,
      isCredit: false,
      rawBody: body,
      payload: {
        transaction_time: time,
        amount: toAmount(rawAmt),
        sender_name: "Awash Bank",
        sender_account: "",
        beneficiary_name: normalizeName(beneficiaryName),
        beneficiary_account: beneficiaryAcct,
        beneficiary_bank: "Awash Bank",
        transaction_type: "sms",
      },
    };
  }

  // Format 2: inter-bank transfer
  const transferRe =
    /You have transferred to other bank ETB\s*([\d,]+(?:\.\d{1,2})?)\s+To\s+(\d+)\s+\(([A-Z][A-Z\s]+?)\)\s+In\s+(.+?)\s+VAT/i;

  const transferMatch = body.match(transferRe);
  if (transferMatch) {
    const [, rawAmt, beneficiaryAcct, beneficiaryName, beneficiaryBank] =
      transferMatch;
    const time = fallbackTime(sms.date);

    return {
      id: sms._id,
      address: sms.address,
      bankName: "Awash Bank",
      date: time,
      isCredit: false,
      rawBody: body,
      payload: {
        transaction_time: time,
        amount: toAmount(rawAmt),
        sender_name: "Awash Bank",
        sender_account: "",
        beneficiary_name: normalizeName(beneficiaryName),
        beneficiary_account: beneficiaryAcct,
        beneficiary_bank: beneficiaryBank.trim(),
        transaction_type: "sms",
      },
    };
  }

  return null;
}

// ─── COMMERCIAL BANK OF ETHIOPIA (CBE) parser ────────────────────────────────

function parseCBE(sms: RawSms): ParsedSms | null {
  const body = sms.body;

  // Format 1: credit
  const creditRe =
    /Account\s+(\S+)\s+has been Credited with ETB\s*([\d,]+(?:\.\d{1,2})?)\s+from\s+([A-Za-z][A-Za-z\s]+?),?\s+on\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})\s+with Ref No\s+(\S+)/i;

  const creditMatch = body.match(creditRe);
  if (creditMatch) {
    const [, myAcct, rawAmt, senderName, dateStr, timeStr] = creditMatch;
    const time = buildIso(dateStr, timeStr);

    return {
      id: sms._id,
      address: sms.address,
      bankName: "Commercial Bank of Ethiopia",
      date: time,
      isCredit: true,
      rawBody: body,
      payload: {
        transaction_time: time,
        amount: toAmount(rawAmt),
        sender_name: normalizeName(senderName),
        sender_account: "",
        beneficiary_name: "",
        beneficiary_account: myAcct,
        beneficiary_bank: "Commercial Bank of Ethiopia",
        transaction_type: "sms",
      },
    };
  }

  // Format 2: debit
  const debitRe =
    /You have transfer(?:r)?ed ETB\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+([A-Za-z][A-Za-z\s]+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})\s+from your account\s+(\S+)/i;

  const debitMatch = body.match(debitRe);
  if (debitMatch) {
    const [, rawAmt, beneficiaryName, dateStr, timeStr, myAcct] = debitMatch;
    const time = buildIso(dateStr, timeStr);

    return {
      id: sms._id,
      address: sms.address,
      bankName: "Commercial Bank of Ethiopia",
      date: time,
      isCredit: false,
      rawBody: body,
      payload: {
        transaction_time: time,
        amount: toAmount(rawAmt),
        sender_name: "Commercial Bank of Ethiopia",
        sender_account: myAcct,
        beneficiary_name: normalizeName(beneficiaryName),
        beneficiary_account: "",
        beneficiary_bank: "",
        transaction_type: "sms",
      },
    };
  }

  return null;
}

// ─── Generic fallback parser ──────────────────────────────────────────────────

function parseGeneric(sms: RawSms): ParsedSms | null {
  const body = sms.body;

  const amountPatterns = [
    /ETB\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*ETB/i,
    /Birr\s*([\d,]+(?:\.\d{1,2})?)/i,
    /amount[^0-9]*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:credited|debited|sent|received)\s+(?:with\s+)?(?:ETB\s*)?([\d,]+(?:\.\d{1,2})?)/i,
  ];

  let amount: number | null = null;
  for (const re of amountPatterns) {
    const m = body.match(re);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(n) && n > 0) {
        amount = n;
        break;
      }
    }
  }
  if (!amount) return null;

  const isCredit =
    /credit(?:ed)?|receiv(?:ed?|ing)|deposit(?:ed)?|incoming/i.test(body);
  const isDebit =
    /debit(?:ed)?|sent|transfer(?:red)?|paid|outgoing|withdraw(?:n)?|payment/i.test(
      body,
    );

  if (!isCredit && !isDebit) return null;

  const bankName = resolveBankName(sms.address, body);

  let time = fallbackTime(sms.date);
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/,
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:at\s+)?(\d{2}:\d{2}:\d{2})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{2}:\d{2})/,
  ];
  for (const re of datePatterns) {
    const m = body.match(re);
    if (m) {
      time = buildIso(m[1], m[2]);
      break;
    }
  }

  let senderName = "";
  let beneficiaryName = "";

  const fromMatch = body.match(
    /from\s+([A-Z][A-Za-z\s]+?)(?:,|\s+on|\s+at|\.|$)/,
  );
  if (fromMatch) senderName = normalizeName(fromMatch[1]);

  const toMatch = body.match(/to\s+([A-Z][A-Za-z\s]+?)(?:\s+on|\s+at|\.|,|$)/);
  if (toMatch) beneficiaryName = normalizeName(toMatch[1]);

  return {
    id: sms._id,
    address: sms.address,
    bankName,
    date: time,
    isCredit,
    rawBody: body,
    payload: {
      transaction_time: time,
      amount,
      sender_name: isCredit ? senderName || bankName : bankName,
      sender_account: "",
      beneficiary_name: isDebit ? beneficiaryName : "",
      beneficiary_account: "",
      beneficiary_bank: isDebit ? bankName : "",
      transaction_type: "sms",
    },
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function parseSms(sms: RawSms): ParsedSms | null {
  const combined = (sms.address + " " + sms.body).toLowerCase();

  if (combined.includes("awash")) {
    return parseAwashBank(sms) ?? parseGeneric(sms);
  }

  if (
    combined.includes("cbe") ||
    combined.includes("8397") ||
    combined.includes("apps.cbe.com")
  ) {
    return parseCBE(sms) ?? parseGeneric(sms);
  }

  return parseGeneric(sms);
}

export function parseAllBankSms(messages: RawSms[]): ParsedSms[] {
  return messages
    .filter((sms) => isBankSms(sms.address, sms.body))
    .map(parseSms)
    .filter((p): p is ParsedSms => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
