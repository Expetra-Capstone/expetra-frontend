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
    return `Analyze this transaction image (which may be a bank SMS screenshot, bank receipt, transfer slip, or invoice) and extract the following fields. Return ONLY a valid JSON object with no markdown or extra text:

{
  "transaction_time": "ISO 8601 datetime string e.g. 2026-03-14T10:30:00Z — use T00:00:00Z if only date is visible",
  "amount": 0.00,
  "sender_name": "Full name of the person or entity who sent/paid",
  "sender_account": "Sender account number or phone number, null if not visible",
  "beneficiary_name": "Full name of the recipient, null if not visible",
  "beneficiary_account": "Recipient account number or phone number, null if not visible",
  "beneficiary_bank": "Name of the recipient's bank, null if not visible",
  "transaction_type": "One of: sms, bank_transfer, receipt, invoice, other"
}

Rules:
- Return ONLY the JSON object, no other text
- amount must be a number, not a string
- transaction_type should be 'sms' for mobile money/SMS alerts, 'bank_transfer' for wire transfers, 'receipt' for physical receipts, 'invoice' for invoices
- If a field is truly not visible or determinable, use null
- Do not guess sender_name or amount — only extract what is clearly visible`;
  }

  private parseResponse(response: any): TransactionData {
    try {
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Strip markdown fences defensively
      const cleaned = content.replace(/```(?:json)?/g, "").trim();

      // FIX: jsonMatch is a RegExpMatchArray — use  to get the matched string
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch : cleaned;

      const parsed = JSON.parse(jsonText);

      return {
        // FIX: .split("T") returns an array — use  for the date portion
        transaction_time:
          parsed.transaction_time ||
          new Date().toISOString().split("T") + "T00:00:00Z",
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
