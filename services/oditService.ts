import { ReceiptData } from "../types/expense.types";
import { OditResponse, OditResult, RawSmsMessage } from "../types/sms.types";

const ODIT_API_URL = "https://s.odit.et/api/parse";
const MAX_BATCH_SIZE = 50;

// ─── Known provider address identifiers ───────────────────────────────────────
export const KNOWN_ADDRESSES = new Set([
  "127",
  "CBE",
  "BOA",
  "Zemen Bank",
  "Awash Bank",
  "DashenBank",
]);

export class OditRateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter = 60) {
    super("Odit rate limit exceeded");
    this.name = "OditRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class OditService {
  private static instance: OditService;

  public static getInstance(): OditService {
    if (!OditService.instance) OditService.instance = new OditService();
    return OditService.instance;
  }

  // ─── Parse a batch of raw SMS messages (max 50) ──────────────────────────
  async parseSmsMessages(messages: RawSmsMessage[]): Promise<OditResponse> {
    if (!messages.length) throw new Error("No messages provided");

    const batch = messages.slice(0, MAX_BATCH_SIZE);

    const response = await fetch(ODIT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: batch }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 60);
        throw new OditRateLimitError(retryAfter);
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(
        `Odit API Error ${response.status}: ${err?.message ?? response.statusText}`,
      );
    }

    return response.json();
  }

  // ─── Parse a single SMS and return ReceiptData ───────────────────────────
  async parseSingleSms(
    body: string,
    address: string,
    date?: string,
  ): Promise<ReceiptData | null> {
    const response = await this.parseSmsMessages([
      {
        id: `sms-${Date.now()}`,
        body,
        address,
        date: date ?? new Date().toISOString(),
      },
    ]);

    const result = response.results[0];
    if (!result) return null;

    return this.mapToReceiptData(result);
  }

  // ─── Filter only messages from supported Ethiopian banks ─────────────────
  filterSupportedMessages(messages: RawSmsMessage[]): RawSmsMessage[] {
    return messages.filter((m) => KNOWN_ADDRESSES.has(m.address));
  }

  // ─── Map odit result → your ReceiptData type ─────────────────────────────
  mapToReceiptData(result: OditResult): ReceiptData {
    const raw = result.extraction.rawFields;
    const isOutgoing = result.metadata.type === "OUTGOING";

    // ── Amount: strip commas before parsing ────────────────────────────────
    const principalStr = result.amounts.principal.amount.replace(/,/g, "");
    const balanceStr = result.amounts.balance?.amount.replace(/,/g, "");

    // ── Merchant name: prefer named merchant, fallback to provider ─────────
    const merchantParticipant = result.participants.find(
      (p) => p.role === "MERCHANT" || p.type === "MERCHANT",
    );
    const merchantName =
      merchantParticipant?.account.accountName ??
      raw["MERCHANT_NAME"] ??
      raw["RECEIVER_NAME"] ??
      raw["SENDER_NAME"] ??
      this.formatProviderName(result.provider);

    // ── Date/time: parse the DD/MM/YYYY HH:MM:SS format ────────────────────
    const { date, time } = this.parseTimestamp(
      result.transaction.timestamp ?? raw["DATETIME"],
    );

    // ── Transaction ID: pick first available key ───────────────────────────
    const txnId = Object.values(result.transaction.transactionId ?? {})[0];

    return {
      merchant_name: merchantName,
      date,
      time,
      total_amount: parseFloat(principalStr) || 0,
      currency: result.amounts.principal.currency ?? "ETB",
      category: this.inferCategory(result),
      payment_method: this.inferPaymentMethod(result.provider),
      tax_amount: 0,
      items: [],
      // Extra fields your ReceiptData type may benefit from:
      // balance_after: balanceStr ? parseFloat(balanceStr) : undefined,
      // transaction_id: txnId,
      // is_incoming: !isOutgoing,
      // provider: result.provider,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private parseTimestamp(timestamp?: string): { date: string; time: string } {
    if (!timestamp) {
      const now = new Date();
      return {
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().slice(0, 5),
      };
    }

    // Format from odit: "09/02/2026 17:26:59" → DD/MM/YYYY HH:MM:SS
    const match = timestamp.match(
      /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/,
    );
    if (match) {
      const [, dd, mm, yyyy, hh, min] = match;
      return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
    }

    // Fallback: try native Date parsing
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return {
        date: parsed.toISOString().split("T")[0],
        time: parsed.toTimeString().slice(0, 5),
      };
    }

    const now = new Date();
    return {
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().slice(0, 5),
    };
  }

  private inferCategory(result: OditResult): string {
    const type = result.transaction.type;
    const msgType = result.messageType;

    if (msgType === "MERCHANT_PAYMENT") return "Shopping";
    if (type === "TRANSFER") return "Other";
    if (type === "DEPOSIT") return "Other";
    if (result.provider === "telebirr") return "Other";

    return "Other";
  }

  private inferPaymentMethod(provider: string): string {
    const map: Record<string, string> = {
      telebirr: "Mobile Payment",
      cbe: "Debit Card",
      boa: "Debit Card",
      zemenbank: "Debit Card",
      awashbank: "Debit Card",
      dashenbank: "Debit Card",
    };
    return map[provider.toLowerCase()] ?? "Other";
  }

  private formatProviderName(provider: string): string {
    const map: Record<string, string> = {
      telebirr: "Telebirr",
      cbe: "Commercial Bank of Ethiopia",
      boa: "Bank of Abyssinia",
      zemenbank: "Zemen Bank",
      awashbank: "Awash Bank",
      dashenbank: "Dashen Bank",
    };
    return map[provider.toLowerCase()] ?? provider;
  }
}
