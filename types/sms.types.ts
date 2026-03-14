export interface RawSmsMessage {
  id: string;
  body: string;
  address: string;
  date: string; // ISO 8601
}

export interface OditAccount {
  accountType: string;
  accountNumber?: string;
  accountName?: string;
}

export interface OditParticipant {
  account: OditAccount;
  role: string;
  type: string;
}

export interface OditTransaction {
  transactionId: Record<string, string>;
  timestamp: string;
  status: string;
  type: string;
}

export interface OditAmount {
  amount: string;
  currency: string;
}

export interface OditResult {
  originalMessage: RawSmsMessage;
  messageType: string;
  participants: OditParticipant[];
  transaction: OditTransaction;
  amounts: {
    principal: OditAmount;
    balance?: OditAmount;
  };
  metadata: {
    receiptUrl?: string;
    type: "OUTGOING" | "INCOMING";
  };
  provider: string;
  extraction: {
    matchedPattern: { name: string; identifier: string };
    fields: { field: string; value: string }[];
    rawFields: Record<string, string>;
  };
}

export interface OditResponse {
  success: boolean;
  results: OditResult[];
  stats: {
    total: number;
    parsed: number;
    unknown: number;
    unsupportedProvider: number;
    byProvider: Record<
      string,
      { total: number; parsed: number; unknown: number }
    >;
  };
}
