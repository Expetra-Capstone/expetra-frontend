import { Platform } from "react-native";
import { RawSmsMessage } from "../types/sms.types";

// Odit-supported sender addresses
export const KNOWN_BANK_ADDRESSES = new Set([
  "127",
  "CBE",
  "BOA",
  "Zemen Bank",
  "Awash Bank",
  "DashenBank",
]);

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  "127": "Telebirr",
  CBE: "Commercial Bank of Ethiopia",
  BOA: "Bank of Abyssinia",
  "Zemen Bank": "Zemen Bank",
  "Awash Bank": "Awash Bank",
  DashenBank: "Dashen Bank",
};

export interface SmsConversation {
  address: string;
  displayName: string;
  messageCount: number;
  lastMessage: string;
  lastDate: string;
  isKnownBank: boolean;
}

export interface SmsFilter {
  address: string;
  fromDate?: Date;
  toDate?: Date;
  maxCount?: number;
}

// Lazy-load native module — only available in dev builds
let SmsAndroid: any = null;
if (Platform.OS === "android") {
  try {
    SmsAndroid = require("react-native-get-sms-android").default;
  } catch {
    console.warn(
      "[SmsReaderService] react-native-get-sms-android not installed",
    );
  }
}

export class SmsReaderService {
  private static instance: SmsReaderService;

  static getInstance(): SmsReaderService {
    if (!SmsReaderService.instance) {
      SmsReaderService.instance = new SmsReaderService();
    }
    return SmsReaderService.instance;
  }

  get isSupported(): boolean {
    return Platform.OS === "android" && SmsAndroid !== null;
  }

  // ── Get grouped conversations (unique senders) ─────────────────────────
  async getConversations(lookbackDays = 180): Promise<SmsConversation[]> {
    if (!this.isSupported) return [];

    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const messages = await this.readRaw({
      box: "inbox",
      minDate: since.getTime(),
      maxCount: 1000,
    });

    const grouped = new Map<string, RawSmsMessage[]>();
    for (const msg of messages) {
      const arr = grouped.get(msg.address) ?? [];
      arr.push(msg);
      grouped.set(msg.address, arr);
    }

    return Array.from(grouped.entries())
      .map(([address, msgs]) => {
        const sorted = [...msgs].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        return {
          address,
          displayName: PROVIDER_DISPLAY_NAMES[address] ?? address,
          messageCount: msgs.length,
          lastMessage: sorted[0].body.replace(/\n/g, " ").slice(0, 100),
          lastDate: sorted[0].date,
          isKnownBank: KNOWN_BANK_ADDRESSES.has(address),
        };
      })
      .sort((a, b) => {
        // Known banks float to top
        if (a.isKnownBank !== b.isKnownBank) return a.isKnownBank ? -1 : 1;
        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      });
  }

  // ── Get messages for a specific address + date range ───────────────────
  async getMessages(filter: SmsFilter): Promise<RawSmsMessage[]> {
    if (!this.isSupported) return [];

    // Include full last day (up to 23:59:59)
    const toEnd = filter.toDate
      ? new Date(
          filter.toDate.getFullYear(),
          filter.toDate.getMonth(),
          filter.toDate.getDate(),
          23,
          59,
          59,
          999,
        )
      : undefined;

    return this.readRaw({
      box: "inbox",
      address: filter.address,
      minDate: filter.fromDate?.getTime(),
      maxDate: toEnd?.getTime(),
      maxCount: filter.maxCount ?? 200,
    });
  }

  // ── Internal: promisified native SMS list call ─────────────────────────
  private readRaw(opts: {
    box?: string;
    address?: string;
    minDate?: number;
    maxDate?: number;
    maxCount?: number;
  }): Promise<RawSmsMessage[]> {
    return new Promise((resolve) => {
      if (!SmsAndroid) return resolve([]);

      const filter: Record<string, any> = {
        box: opts.box ?? "inbox",
        maxCount: opts.maxCount ?? 200,
      };
      if (opts.address) filter.address = opts.address;
      if (opts.minDate != null) filter.minDate = opts.minDate;
      if (opts.maxDate != null) filter.maxDate = opts.maxDate;

      SmsAndroid.list(
        JSON.stringify(filter),
        (error: string) => {
          console.error("[SmsReader] Failed:", error);
          resolve([]);
        },
        (_count: number, smsList: string) => {
          try {
            const parsed: any[] = JSON.parse(smsList);
            resolve(
              parsed.map((sms) => ({
                id: String(
                  sms._id ?? sms.id ?? `sms-${Date.now()}-${Math.random()}`,
                ),
                body: String(sms.body ?? ""),
                address: String(sms.address ?? ""),
                date: new Date(Number(sms.date)).toISOString(),
              })),
            );
          } catch {
            resolve([]);
          }
        },
      );
    });
  }
}
