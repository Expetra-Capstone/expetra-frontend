import { GEMINI_CONFIG } from "@/constants/gemeni";
import { TransactionData } from "@/types/transaction.type";

export class RateLimitError extends Error {
  constructor() {
    super("Free tier limit reached");
    this.name = "RateLimitError";
  }
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
            console.warn(`Rate limited on attempt ${attempt}, retrying in 2s…`);
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }
          throw new RateLimitError();
        }

        const isRetryable = [500, 503].includes(response.status);
        if (isRetryable && attempt < retries) {
          console.warn(
            `Attempt ${attempt} failed (${msg}), retrying in ${800 * attempt}ms…`,
          );
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
  "amount": <number — the primary transaction amount, no currency symbols, no commas — e.g. 1500.00>,
  "sender_name": "<full name or entity that sent/paid — e.g. 'Alice Tesfaye', 'Abyssinia Bank', 'CBE Birr'>",
  "sender_account": "<sender's account number, phone number, or wallet ID — null if not shown>",
  "beneficiary_name": "<full name or entity that received the money — null if not shown>",
  "beneficiary_account": "<recipient's account number, phone, or wallet ID — null if not shown>",
  "beneficiary_bank": "<name of the recipient's bank or mobile money provider — null if not shown>",
  "transaction_type": "<one of: sms | bank_transfer | receipt | invoice | other>"
}

Classification rules for transaction_type:
- "sms"           → mobile money SMS alert (CBE Birr, M-Pesa, Telebirr, bank debit/credit notification)
- "bank_transfer" → wire transfer or inter-bank transfer slip/confirmation
- "receipt"       → physical or digital POS/ATM receipt
- "invoice"       → formal invoice or bill document
- "other"         → anything that does not clearly fit the above

Extraction rules:
- amount MUST be a plain number (no strings, no commas, no currency signs)
- If multiple amounts appear (e.g. subtotal + fees), use the final/total transaction amount
- For Ethiopian banks: recognise CBE, Awash Bank, Abyssinia Bank, Dashen, BOA, Wegagen, Telebirr, M-Pesa, HelloCash, amole
- sender_name and beneficiary_name: prefer the full name; use the account holder name if visible on the slip
- transaction_time: read 12-hour or 24-hour clock formats; handle Ethiopian calendar dates by converting to Gregorian
- If a field is genuinely not visible or determinable, set it to null — do NOT guess or fabricate values
- amount, sender_name, and transaction_type are required — do not return null for these three`;
  }

  private parseResponse(response: any): TransactionData {
    try {
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Strip markdown fences defensively
      const cleaned = content.replace(/```(?:json)?/g, "").trim();

      // FIX: use [0] to get the matched string from the RegExpMatchArray
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : cleaned;

      const parsed = JSON.parse(jsonText);

      return {
        // FIX: use [0] to get the date portion from the split array
        transaction_time:
          parsed.transaction_time ||
          new Date().toISOString().split("T")[0] + "T00:00:00Z",
        amount: Number(parsed.amount) || 0,
        sender_name: parsed.sender_name || "Unknown Sender",
        sender_account: parsed.sender_account ?? null,
        beneficiary_name: parsed.beneficiary_name ?? null,
        beneficiary_account: parsed.beneficiary_account ?? null,
        beneficiary_bank: parsed.beneficiary_bank ?? null,
        transaction_type: this.validateTransactionType(parsed.transaction_type),
      };
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      throw new Error("Failed to parse transaction data from Gemini response");
    }
  }

  private validateTransactionType(type: string): string {
    const valid = ["sms", "bank_transfer", "receipt", "invoice", "other"];
    return valid.includes(type) ? type : "other";
  }
}
