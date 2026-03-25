// services/smsParser.ts

import { TransactionPayload } from "./apiService";

// ─── Raw SMS shape from react-native-get-sms-android ─────────────────────────
export interface RawSms {
  _id: string;
  address: string;
  body: string;
  date: string; // received timestamp in ms as string
  date_sent: string;
  read: string;
  type: string;
}

// ─── Result of parsing one SMS ────────────────────────────────────────────────
export interface ParsedSms {
  id: string;
  address: string;
  bankName: string;
  date: string; // ISO 8601
  isCredit: boolean;
  rawBody: string;
  payload: TransactionPayload;
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

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Parse ETB amount string to a clean number.
 * Handles "1", "280", "1,270.00", "345.00" etc.
 */
function toAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

/**
 * Build an ISO 8601 string from the date/time parts found in the SMS body.
 * Falls back to the SMS received timestamp if nothing is found.
 */
function buildIso(dateStr: string, timeStr: string): string {
  try {
    // ISO-style date: 2026-03-23  →  keep as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(`${dateStr}T${timeStr}Z`).toISOString();
    }
    // Ethiopian / DD/MM/YYYY style: 24/03/2026  →  reorder to YYYY-MM-DD
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
//
// Handles two confirmed Awash message formats:
//
// 1. Same-bank send:
//    "Dear Customer, You have sent ETB 1 To (01335853377300) - NAHOM TEMESGEN RETEBO
//     by Transaction ID: 260323164711443 charge- 1.00 VAT- 0.15
//     Date 2026-03-23 16:47:36 . Your Available Balance is 260.79."
//
// 2. Inter-bank transfer:
//    "Dear Customer , You have transferred to other bank ETB  280  To 1000600192624
//     (BEKA TSEGAYE DEBELE) In Commercial Bank of Ethiopia VAT: 0.26.
//     Your available Balance is  ETB 262.99."

function parseAwashBank(sms: RawSms): ParsedSms | null {
  const body = sms.body;

  // ── Format 1: same-bank send ────────────────────────────────────────────────
  // "You have sent ETB {amount} To ({account}) - {BENEFICIARY NAME} by Transaction ID: {txnId}
  //  ... Date {YYYY-MM-DD HH:MM:SS}"
  const sentRe =
    /You have sent ETB\s*([\d,]+(?:\.\d{1,2})?)\s+To\s+\((\d+)\)\s+-\s+([A-Z][A-Z\s]+?)\s+by Transaction ID:\s*(\S+).*?Date\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/is;

  const sentMatch = body.match(sentRe);
  if (sentMatch) {
    const [
      ,
      rawAmt,
      beneficiaryAcct,
      beneficiaryName,
      txnId,
      dateStr,
      timeStr,
    ] = sentMatch;
    const time = buildIso(dateStr, timeStr);
    const balMatch = body.match(
      /Your Available Balance is\s+([\d,]+(?:\.\d{1,2})?)/i,
    );

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
        beneficiary_name: beneficiaryName.trim(),
        beneficiary_account: beneficiaryAcct,
        beneficiary_bank: "Awash Bank",
        transaction_type: "sms",
      },
    };
  }

  // ── Format 2: inter-bank transfer ───────────────────────────────────────────
  // "You have transferred to other bank ETB {amount} To {account} ({BENEFICIARY NAME})
  //  In {Beneficiary Bank} VAT: ..."
  const transferRe =
    /You have transferred to other bank ETB\s*([\d,]+(?:\.\d{1,2})?)\s+To\s+(\d+)\s+\(([A-Z][A-Z\s]+?)\)\s+In\s+(.+?)\s+VAT/i;

  const transferMatch = body.match(transferRe);
  if (transferMatch) {
    const [, rawAmt, beneficiaryAcct, beneficiaryName, beneficiaryBank] =
      transferMatch;

    // No explicit date in this format — fall back to SMS received time
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
        beneficiary_name: beneficiaryName.trim(),
        beneficiary_account: beneficiaryAcct,
        beneficiary_bank: beneficiaryBank.trim(),
        transaction_type: "sms",
      },
    };
  }

  return null;
}

// ─── COMMERCIAL BANK OF ETHIOPIA (CBE) parser ─────────────────────────────────
//
// Handles two confirmed CBE message formats:
//
// 1. Credit (incoming):
//    "Dear Leul your Account 1*****0191 has been Credited with ETB 345.00
//     from Yitbarek Andualem, on 24/03/2026 at 13:37:25 with Ref No FT26083F74BV
//     Your Current Balance is ETB 948.46."
//
// 2. Debit (outgoing transfer):
//    "Dear Leul, You have transfered ETB 1,270.00 to Beka Tsegaye on 24/03/2026
//     at 13:35:12 from your account 1*****0191. Your account has been debited
//     with a S.charge of ETB 1.00 ... Your Current Balance is ETB 223.46."

function parseCBE(sms: RawSms): ParsedSms | null {
  const body = sms.body;

  // ── Format 1: credit ────────────────────────────────────────────────────────
  // "Account {acct} has been Credited with ETB {amount} from {Sender Name},
  //  on {DD/MM/YYYY} at {HH:MM:SS} with Ref No {ref}"
  const creditRe =
    /Account\s+(\S+)\s+has been Credited with ETB\s*([\d,]+(?:\.\d{1,2})?)\s+from\s+([A-Za-z][A-Za-z\s]+?),?\s+on\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})\s+with Ref No\s+(\S+)/i;

  const creditMatch = body.match(creditRe);
  if (creditMatch) {
    const [, myAcct, rawAmt, senderName, dateStr, timeStr, refNo] = creditMatch;
    const time = buildIso(dateStr, timeStr);
    const balMatch = body.match(
      /Current Balance is ETB\s*([\d,]+(?:\.\d{1,2})?)/i,
    );

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
        sender_name: senderName.trim(),
        sender_account: "",
        beneficiary_name: "",
        beneficiary_account: myAcct,
        beneficiary_bank: "Commercial Bank of Ethiopia",
        transaction_type: "sms",
      },
    };
  }

  // ── Format 2: debit ─────────────────────────────────────────────────────────
  // "You have transfered ETB {amount} to {Beneficiary Name} on {DD/MM/YYYY}
  //  at {HH:MM:SS} from your account {acct}"
  // Note: CBE spells "transfered" with one r — intentional
  const debitRe =
    /You have transfer(?:r)?ed ETB\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+([A-Za-z][A-Za-z\s]+?)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+at\s+(\d{2}:\d{2}:\d{2})\s+from your account\s+(\S+)/i;

  const debitMatch = body.match(debitRe);
  if (debitMatch) {
    const [, rawAmt, beneficiaryName, dateStr, timeStr, myAcct] = debitMatch;
    const time = buildIso(dateStr, timeStr);
    const balMatch = body.match(
      /Current Balance is ETB\s*([\d,]+(?:\.\d{1,2})?)/i,
    );

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
        beneficiary_name: beneficiaryName.trim(),
        beneficiary_account: "",
        beneficiary_bank: "",
        transaction_type: "sms",
      },
    };
  }

  return null;
}

// ─── Generic fallback parser (other banks) ────────────────────────────────────
// Used for all banks not yet given a dedicated parser above.
// Less precise but still extracts amount and direction.

function parseGeneric(sms: RawSms): ParsedSms | null {
  const body = sms.body;

  // Amount
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

  // Generic date extraction
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

  // Generic name extraction
  let senderName = "";
  let beneficiaryName = "";

  const fromMatch = body.match(
    /from\s+([A-Z][A-Za-z\s]+?)(?:,|\s+on|\s+at|\.|$)/,
  );
  if (fromMatch) senderName = fromMatch[1].trim();

  const toMatch = body.match(/to\s+([A-Z][A-Za-z\s]+?)(?:\s+on|\s+at|\.|,|$)/);
  if (toMatch) beneficiaryName = toMatch[1].trim();

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

  // Try dedicated parsers first for maximum accuracy
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

  // All other banks use the generic parser
  return parseGeneric(sms);
}

export function parseAllBankSms(messages: RawSms[]): ParsedSms[] {
  return messages
    .filter((sms) => isBankSms(sms.address, sms.body))
    .map(parseSms)
    .filter((p): p is ParsedSms => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
