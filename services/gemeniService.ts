import { GEMINI_CONFIG } from "@/constants/gemeni";
import { TransactionData } from "@/types/transaction.type";

export class RateLimitError extends Error {
  constructor() {
    super("Free tier limit reached");
    this.name = "RateLimitError";
  }
}

// ─── Map any Gemini output → backend-safe enum value ─────────────────────────
// Backend only accepts: sms | receipt | invoice | other
const TYPE_MAP: Record<string, string> = {
  sms: "sms",
  receipt: "receipt",
  invoice: "invoice",
  other: "other",
  bank_transfer: "other",
  transfer: "other",
  "transfer money": "other",
  payment: "other",
  deposit: "other",
  withdrawal: "other",
  debit: "other",
  credit: "other",
};

function toSafeType(raw: unknown): string {
  if (!raw || typeof raw !== "string") return "other";
  return TYPE_MAP[raw.toLowerCase().trim()] ?? "other";
}

// ─── Parse amount to a clean number regardless of Gemini's formatting ─────────
function toSafeAmount(raw: unknown): number {
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export class GeminiService {
  private static instance: GeminiService;
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private fallbackModel: string;

  private constructor() {
    this.apiKey = GEMINI_CONFIG.API_KEY;
    this.apiUrl = GEMINI_CONFIG.API_URL;
    this.model = GEMINI_CONFIG.MODEL;
    this.fallbackModel = GEMINI_CONFIG.FALLBACK_MODEL;
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  async extractTransactionData(base64Image: string): Promise<TransactionData> {
    try {
      return await this.callModel(base64Image, this.model);
    } catch (primaryError) {
      console.warn(`Primary model failed, trying fallback: ${primaryError}`);
      try {
        return await this.callModel(base64Image, this.fallbackModel);
      } catch (fallbackError) {
        throw new Error(
          `Failed to extract transaction data: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error"
          }`,
        );
      }
    }
  }

  private async callModel(
    base64Image: string,
    model: string,
    retries = 2,
  ): Promise<TransactionData> {
    const url = `${this.apiUrl}/${model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: this.buildPrompt() },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
      },
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg =
          errorData?.error?.message ||
          `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 429) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }
          throw new RateLimitError();
        }

        const isRetryable = [500, 503].includes(response.status);
        if (isRetryable && attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        throw new Error(`Gemini API Error: ${msg}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    }

    throw new Error("All retry attempts exhausted");
  }

  private buildPrompt(): string {
    return `You are a financial document parser. Analyze this image carefully — it may be a bank SMS screenshot, mobile money notification, bank transfer slip, ATM receipt, POS receipt, or invoice.

Extract the fields below and return ONLY a single valid JSON object. No markdown, no code fences, no explanation — just the raw JSON.

{
  "transaction_time": "<ISO 8601 string, e.g. 2026-03-14T10:30:00Z — if only a date is visible use T00:00:00Z suffix — if no date at all use today's date>",
  "amount": <number — the primary transaction amount as a plain positive number, no currency symbols, no commas, no minus sign — e.g. 1500.00>,
  "sender_name": "<full name or entity that sent/paid — e.g. 'Alice Tesfaye', 'Abyssinia Bank', 'Telebirr'>",
  "sender_account": "<sender's account number, phone number, or wallet ID — null if not shown>",
  "beneficiary_name": "<full name or entity that received the money — null if not shown>",
  "beneficiary_account": "<recipient's account number, phone, or wallet ID — null if not shown>",
  "beneficiary_bank": "<name of the recipient's bank or mobile money provider — null if not shown>",
  "transaction_type": "<one of: sms | receipt | invoice | other>"
}

Classification rules for transaction_type:
- "sms"     → any mobile money or bank transfer notification: Telebirr, CBE Birr, M-Pesa, HelloCash, Amole, any "Transfer Money" or "Transfer Successful" screen
- "receipt" → physical or digital POS/ATM receipt
- "invoice" → formal invoice or bill document
- "other"   → anything that does not clearly fit the above

IMPORTANT: transaction_type must be exactly one of: sms, receipt, invoice, other — nothing else.

Extraction rules:
- amount MUST be a plain positive number (no strings, no commas, no currency signs, no minus)
- If multiple amounts appear, use the final/total transaction amount
- For Ethiopian banks: recognise CBE, Awash Bank, Abyssinia Bank, Dashen, BOA, Wegagen, Telebirr, M-Pesa, HelloCash, amole
- transaction_time: read 12-hour or 24-hour clock; convert Ethiopian calendar to Gregorian if needed
- If a field is genuinely not visible, set it to null — do NOT guess
- amount, sender_name, and transaction_type are required — never null`;
  }

  private parseResponse(response: any): TransactionData {
    try {
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = content.replace(/```(?:json)?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

      return {
        transaction_time:
          parsed.transaction_time ||
          new Date().toISOString().split("T")[0] + "T00:00:00Z",
        amount: toSafeAmount(parsed.amount),
        sender_name: parsed.sender_name || "Unknown Sender",
        sender_account: parsed.sender_account ?? null,
        beneficiary_name: parsed.beneficiary_name ?? null,
        beneficiary_account: parsed.beneficiary_account ?? null,
        beneficiary_bank: parsed.beneficiary_bank ?? null,
        transaction_type: toSafeType(parsed.transaction_type),
      };
    } catch (error) {
      throw new Error("Failed to parse transaction data from Gemini response");
    }
  }
}
