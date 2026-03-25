const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type Ok<T> = { data: T; error?: never };
type Err = { data?: never; error: string };
type ApiResult<T> = Promise<Ok<T> | Err>;

// ─── UNAUTHORIZED HANDLER ─────────────────────────────────────────────────────
let _unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void): void => {
  _unauthorizedHandler = handler;
};

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    const { exp } = JSON.parse(json) as { exp?: number };
    if (!exp) return false;
    return Math.floor(Date.now() / 1000) >= exp;
  } catch {
    return false;
  }
}

// ─── CORE REQUEST ─────────────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): ApiResult<T> {
  const hasBody = options.body !== undefined && options.body !== null;
  const incomingHeaders = (options.headers as Record<string, string>) ?? {};
  const isAuthenticated = !!incomingHeaders["Authorization"];

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...incomingHeaders,
  };

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: finalHeaders,
    });

    const rawText = await res.text();

    if (!rawText.trim()) {
      if (res.ok) return { data: {} as T };
      return { error: `Request failed with status ${res.status}.` };
    }

    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      return { error: "Server returned an unexpected response." };
    }

    if (!res.ok) {
      const authHeader = incomingHeaders["Authorization"] ?? "";
      if (res.status === 401 && isAuthenticated && _unauthorizedHandler) {
        const token = authHeader.replace("Bearer ", "");
        if (isJwtExpired(token)) {
          _unauthorizedHandler();
        }
      }

      const errJson = json as Record<string, unknown>;
      const msg =
        (errJson?.error as string) ??
        (errJson?.message as string) ??
        (Array.isArray(errJson?.errors)
          ? (errJson.errors as string[]).join(", ")
          : (errJson?.errors as string)) ??
        `Request failed with status ${res.status}.`;

      return { error: msg };
    }

    return { data: json as T };
  } catch {
    return { error: "Network error. Please check your connection." };
  }
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface OwnerProfile {
  id: number;
  owner_name: string;
  company_name: string;
  phone: string;
}

export interface BusinessProfile {
  id: number;
  name: string;
  invitation_id: string;
}

export interface OwnerResponse {
  owner: OwnerProfile;
  business: BusinessProfile;
}

export interface LoginResponse {
  token: string;
  role: "owner" | "employee";
}

export interface EmployeeResponse {
  id: number;
  name: string;
  phone: string;
  business: {
    id: number;
    name: string;
  };
}

export interface Transaction {
  id: number;
  transaction_time: string;
  amount: number;
  sender_name: string;
  sender_account?: string;
  beneficiary_name?: string;
  beneficiary_account?: string;
  beneficiary_bank?: string;
  transaction_type: string;
}

export type TransactionPayload = Omit<Transaction, "id">;

export interface ValidatedBalanceResponse {
  total_balance: number;
}

// ─── OWNER ENDPOINTS ──────────────────────────────────────────────────────────

export const createOwner = (data: {
  owner_name: string;
  company_name: string;
  phone: string;
  password: string;
  password_confirmation: string;
}): ApiResult<OwnerResponse> =>
  request("/owners", {
    method: "POST",
    body: JSON.stringify({ owner: data }),
  });

export const ownerLogin = (
  phone: string,
  password: string,
): ApiResult<LoginResponse> =>
  request("/owner_login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

export const getOwners = (token: string): ApiResult<OwnerResponse[]> =>
  request("/owners", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getOwnerProfile = (token: string): ApiResult<OwnerResponse> =>
  request("/owners/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── EMPLOYEE ENDPOINTS ───────────────────────────────────────────────────────

export const createEmployee = (data: {
  invitation_code: string;
  name: string;
  phone: string;
  password: string;
  password_confirmation: string;
}): ApiResult<EmployeeResponse> =>
  request("/employees", {
    method: "POST",
    body: JSON.stringify({
      invitation_code: data.invitation_code,
      employee: {
        name: data.name,
        phone: data.phone,
        password: data.password,
        password_confirmation: data.password_confirmation,
      },
    }),
  });

export const employeeLogin = (
  phone: string,
  password: string,
): ApiResult<LoginResponse> =>
  request("/employee_login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

export const getEmployeeProfile = (
  token: string,
): ApiResult<EmployeeResponse> =>
  request("/employees/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getEmployees = (token: string): ApiResult<EmployeeResponse[]> =>
  request("/employees", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── TRANSACTION ENDPOINTS ────────────────────────────────────────────────────

export const getTransactions = (token: string): ApiResult<Transaction[]> =>
  request("/transactions", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getValidatedTransactions = (
  token: string,
): ApiResult<Transaction[]> =>
  request("/transactions/validated", {
    headers: { Authorization: `Bearer ${token}` },
  });

/** GET /transactions/validated_balance → { total_balance: number } */
export const getValidatedBalance = (
  token: string,
): ApiResult<ValidatedBalanceResponse> =>
  request("/transactions/validated_balance", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const createTransaction = (
  token: string,
  data: TransactionPayload,
): ApiResult<Transaction> =>
  request("/transactions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transaction: data }),
  });
