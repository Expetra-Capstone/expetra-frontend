// services/openRouterService.ts

import { OPENROUTER_CONFIG } from "../constants/openRouter";
import { ReceiptData } from "../types/transaction.type";

export class OpenRouterService {
  private static instance: OpenRouterService;
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  private constructor() {
    this.apiKey = OPENROUTER_CONFIG.API_KEY;
    this.apiUrl = OPENROUTER_CONFIG.API_URL;
    this.model = OPENROUTER_CONFIG.MODEL;
  }

  public static getInstance(): OpenRouterService {
    if (!OpenRouterService.instance) {
      OpenRouterService.instance = new OpenRouterService();
    }
    return OpenRouterService.instance;
  }

  /**
   * Extract receipt data from base64 image using OpenRouter API with Mistral
   */
  async extractReceiptData(base64Image: string): Promise<ReceiptData> {
    try {
      const prompt = this.buildPrompt();
      const requestBody = this.buildRequestBody(base64Image, prompt);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": OPENROUTER_CONFIG.SITE_URL || "https://localhost",
          "X-Title": OPENROUTER_CONFIG.APP_NAME,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenRouter API Error: ${errorData.error?.message || "Unknown error"}`,
        );
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error("Error extracting receipt data:", error);
      throw new Error(
        `Failed to extract receipt data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Build the prompt for receipt extraction
   */
  private buildPrompt(): string {
    return `Analyze this receipt image carefully and extract the following information. Return ONLY a valid JSON object with the exact structure shown below, no additional text or markdown formatting:

{
  "merchant_name": "Name of the store/restaurant",
  "date": "Date in YYYY-MM-DD format",
  "time": "Time in HH:MM format (24-hour)",
  "total_amount": 0.00,
  "category": "One of: Food & Dining, Transportation, Shopping, Entertainment, Healthcare, Utilities, Other",
  "payment_method": "One of: Cash, Credit Card, Debit Card, Mobile Payment, Other",
  "tax_amount": 0.00,
  "items": [
    {
      "name": "Item name",
      "quantity": 1,
      "price": 0.00
    }
  ]
}

Important rules:
- Return ONLY the JSON object, no other text
- All numeric values must be numbers, not strings
- Use the exact category and payment_method values from the lists above
- If information is unclear, use reasonable defaults
- Extract all visible line items into the items array`;
  }

  /**
   * Build request body for OpenRouter API with vision support
   */
  private buildRequestBody(base64Image: string, prompt: string) {
    // OpenRouter uses OpenAI-compatible format
    return {
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.15,
      max_tokens: 2048,
    };
  }

  /**
   * Parse OpenRouter API response
   */
  private parseResponse(response: any): ReceiptData {
    try {
      // OpenRouter follows OpenAI response format
      const content = response.choices?.[0]?.message?.content || "";

      // Remove any markdown code blocks if present
      const cleanedText = content
        .replace(/```/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Find JSON object in the response
      let jsonText = cleanedText;
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsedData = JSON.parse(jsonText);

      // Validate and return with defaults
      return {
        merchant_name: parsedData.merchant_name || "Unknown Merchant",
        date: parsedData.date || new Date().toISOString().split("T")[0],
        time: parsedData.time || new Date().toTimeString().slice(0, 5),
        total_amount: Number(parsedData.total_amount) || 0,
        category: this.validateCategory(parsedData.category),
        payment_method: this.validatePaymentMethod(parsedData.payment_method),
        tax_amount: parsedData.tax_amount ? Number(parsedData.tax_amount) : 0,
        items: Array.isArray(parsedData.items)
          ? parsedData.items.map((item: any) => ({
              name: item.name || "Unknown Item",
              quantity: Number(item.quantity) || 1,
              price: Number(item.price) || 0,
            }))
          : [],
      };
    } catch (error) {
      console.error("Error parsing OpenRouter response:", error);
      throw new Error("Failed to parse receipt data from API response");
    }
  }

  /**
   * Validate category against allowed values
   */
  private validateCategory(category: string): string {
    const validCategories = [
      "Food & Dining",
      "Transportation",
      "Shopping",
      "Entertainment",
      "Healthcare",
      "Utilities",
      "Other",
    ];

    return validCategories.includes(category) ? category : "Other";
  }

  /**
   * Validate payment method against allowed values
   */
  private validatePaymentMethod(method: string): string {
    const validMethods = [
      "Cash",
      "Credit Card",
      "Debit Card",
      "Mobile Payment",
      "Other",
    ];

    return validMethods.includes(method) ? method : "Other";
  }
}
