import { GEMINI_CONFIG } from "@/constants/gemeni";
import { normalizeName } from "@/services/smsParser";
import { TransactionData } from "@/types/transaction.type";

export class RateLimitError extends Error {
  constructor() {
    super("Free tier limit reached");
    this.name = "RateLimitError";
  }
}

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
  "amount": <number — the PRINCIPAL transaction amount only as a plain positive number with no currency symbols or commas — do NOT include VAT, commission, service charge, or any fee — e.g. if the transfer is 1270.00 and there is a 1.00 service charge, return 1270.00 not 1271.00>,
  "sender_name": "<full name of the person or entity that sent/paid exactly as shown — e.g. 'Betemariam Abenet Brhane' or 'Yitbarek Andualem'>",
  "sender_account": "<sender's account number, phone number, or wallet ID — null if not shown>",
  "beneficiary_name": "<full name of the recipient exactly as shown — null if not shown>",
  "beneficiary_account": "<recipient's account number, phone, or wallet ID — null if not shown>",
  "beneficiary_bank": "<name of the recipient's bank or mobile money provider — null if not shown>"
}

Extraction rules:
- amount MUST be the principal transfer amount only — exclude VAT, tax, commission, service charge, disaster fund, or any additional fee
- For names: extract the full name exactly as it appears on screen — do not shorten or truncate
- If multiple amounts appear, use the main transfer/transaction amount, not the total including charges
- For Ethiopian banks: recognise CBE, Awash Bank, Abyssinia Bank, Dashen, BOA, Wegagen, Telebirr, M-Pesa, HelloCash, amole
- transaction_time: read 12-hour or 24-hour clock; convert Ethiopian calendar to Gregorian if needed
- If a field is genuinely not visible, set it to null — do NOT guess
- amount and sender_name are required — never null`;
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
        // Gemini returns the full name — normalizeName trims to 2 words + Title Case
        // "BETEMARIAM ABENET BRHANE" → "Betemariam Abenet"
        // "Yitbarek Andualem"        → "Yitbarek Andualem"
        sender_name: normalizeName(parsed.sender_name || "Unknown Sender"),
        sender_account: parsed.sender_account ?? null,
        beneficiary_name: parsed.beneficiary_name
          ? normalizeName(parsed.beneficiary_name)
          : null,
        beneficiary_account: parsed.beneficiary_account ?? null,
        beneficiary_bank: parsed.beneficiary_bank ?? null,
        transaction_type: "screenshot",
      };
    } catch {
      throw new Error("Failed to parse transaction data from Gemini response");
    }
  }
}
