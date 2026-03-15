// ─── BASE ─────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type Ok<T> = { data: T; error?: never };
type Err = { data?: never; error: string };
type ApiResult<T> = Promise<Ok<T> | Err>;

async function request<T>(
  path: string,
  options: RequestInit = {},
): ApiResult<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { error: "Server returned an unexpected response." };
    }

    if (!res.ok) {
      const errJson = json as Record<string, unknown>;
      const msg =
        (errJson?.error as string) ??
        (errJson?.message as string) ??
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

// ─── OWNER ENDPOINTS ──────────────────────────────────────────────────────────

/** POST /owners — Create a new business owner account */
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

/** POST /owner_login */
export const ownerLogin = (
  phone: string,
  password: string,
): ApiResult<LoginResponse> =>
  request("/owner_login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

/** GET /owners — requires owner token */
export const getOwners = (token: string): ApiResult<OwnerResponse[]> =>
  request("/owners", {
    headers: { Authorization: `Bearer ${token}` },
  });

/** GET /owners/me — owner profile */
export const getOwnerProfile = (token: string): ApiResult<OwnerResponse> =>
  request("/owners/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── EMPLOYEE ENDPOINTS ───────────────────────────────────────────────────────

/** POST /employees — Create a new employee using an invitation code */
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

/** POST /employee_login */
export const employeeLogin = (
  phone: string,
  password: string,
): ApiResult<LoginResponse> =>
  request("/employee_login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

/** GET /employees — requires owner token */
export const getEmployees = (token: string): ApiResult<EmployeeResponse[]> =>
  request("/employees", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── TRANSACTION ENDPOINTS ────────────────────────────────────────────────────

/** GET /transactions — requires owner or employee token */
export const getTransactions = (token: string): ApiResult<Transaction[]> =>
  request("/transactions", {
    headers: { Authorization: `Bearer ${token}` },
  });

/** POST /transactions — requires employee token */
export const createTransaction = (
  token: string,
  data: TransactionPayload,
): ApiResult<Transaction> =>
  request("/transactions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transaction: data }),
  });
