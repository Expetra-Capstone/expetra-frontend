import { GEMINI_CONFIG } from "../constants/gemeni";
import { ReceiptData } from "../types/expense.types";

// ✅ Add at the top of geminiService.ts — before the class
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

  async extractReceiptData(base64Image: string): Promise<ReceiptData> {
    try {
      return await this.callModel(base64Image, this.model);
    } catch (primaryError) {
      console.warn(`Primary model failed, trying fallback: ${primaryError}`);
      try {
        return await this.callModel(base64Image, this.fallbackModel);
      } catch (fallbackError) {
        throw new Error(
          `Failed to extract receipt data: ${
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
  ): Promise<ReceiptData> {
    // ✅ Gemini uses ?key= in the URL, not Authorization header
    const url = `${this.apiUrl}/${model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: this.buildPrompt() },
            {
              // ✅ Gemini uses inlineData, NOT image_url like OpenAI/OpenRouter
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 1024,
        // ✅ Ask Gemini to return JSON directly — cleaner parsing
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

        // ✅ Detect rate limit — 429 = RESOURCE_EXHAUSTED (daily/minute quota)
        if (response.status === 429) {
          if (attempt < retries) {
            console.warn(`Rate limited on attempt ${attempt}, retrying in 2s…`);
            await new Promise((r) => setTimeout(r, 2000 * attempt));
            continue;
          }
          // All retries exhausted on 429 → throw named error so UI can handle it
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
    return `Analyze this receipt image and extract the following information. Return ONLY a valid JSON object with no markdown or extra text:

{
  "merchant_name": "Name of the store/restaurant",
  "date": "Date in YYYY-MM-DD format",
  "time": "Time in HH:MM format (24-hour)",
  "total_amount": 0.00,
  "currency": "3-letter ISO currency code e.g. USD, EUR, ETB",
  "category": "One of: Food & Dining, Transportation, Shopping, Entertainment, Healthcare, Utilities, Other",
  "payment_method": "One of: Cash, Credit Card, Debit Card, Mobile Payment, Other",
  "tax_amount": 0.00,
  "items": [
    { "name": "Item name", "quantity": 1, "price": 0.00 }
  ]
}

Rules:
- Return ONLY the JSON object, no other text
- All numeric values must be numbers not strings
- Use exact category and payment_method values listed above
- Extract all visible line items`;
  }

  private parseResponse(response: any): ReceiptData {
    try {
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // ✅ We requested responseMimeType: "application/json"
      // so content should already be clean JSON — but we still
      // strip markdown fences defensively
      const cleaned = content.replace(/```(?:json)?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch : cleaned;

      const parsed = JSON.parse(jsonText);

      return {
        merchant_name: parsed.merchant_name || "Unknown Merchant",
        date: parsed.date || new Date().toISOString().split("T"),
        time: parsed.time || new Date().toTimeString().slice(0, 5),
        total_amount: Number(parsed.total_amount) || 0,
        currency: parsed.currency || "USD",
        category: this.validateCategory(parsed.category),
        payment_method: this.validatePaymentMethod(parsed.payment_method),
        tax_amount: Number(parsed.tax_amount) || 0,
        items: Array.isArray(parsed.items)
          ? parsed.items.map((item: any) => ({
              name: item.name || "Unknown Item",
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0,
            }))
          : [],
      };
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      throw new Error("Failed to parse receipt data from Gemini response");
    }
  }

  private validateCategory(category: string): string {
    const valid = [
      "Food & Dining",
      "Transportation",
      "Shopping",
      "Entertainment",
      "Healthcare",
      "Utilities",
      "Other",
    ];
    return valid.includes(category) ? category : "Other";
  }

  private validatePaymentMethod(method: string): string {
    const valid = [
      "Cash",
      "Credit Card",
      "Debit Card",
      "Mobile Payment",
      "Other",
    ];
    return valid.includes(method) ? method : "Other";
  }
}
