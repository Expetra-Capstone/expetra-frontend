const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Error Class ──────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
  ) {
    super(data?.error ?? data?.message ?? "Unexpected error");
  }
}

// ─── Human-Readable Error Parser ─────────────────────────────────────────────

export function parseApiError(error: unknown): string {
  if (error instanceof ApiError) {
    const { status, data } = error;

    if (status === 401)
      return "Incorrect phone number or password. Please try again.";
    if (status === 404)
      return "No account found with these credentials. Please check and try again.";
    if (status === 409 || status === 422) {
      // Rails validation errors: { errors: { field: ["msg", ...] } }
      if (data?.errors && typeof data.errors === "object") {
        const messages = Object.entries(data.errors)
          .flatMap(([field, msgs]) =>
            (msgs as string[]).map((m) => `${field.replace(/_/g, " ")} ${m}`),
          )
          .join(". ");
        return messages || "Please check your information and try again.";
      }
      if (status === 409)
        return "An account with this phone number already exists.";
      return data?.message ?? "Please check your information and try again.";
    }
    if (status === 403)
      return "Invalid invitation code. Please ask your business owner for the correct code.";
    if (status >= 500) return "Server error. Please try again in a moment.";

    return error.message || "Something went wrong. Please try again.";
  }

  if (
    error instanceof TypeError &&
    (error.message.includes("fetch") ||
      error.message.includes("Network") ||
      error.message.includes("connect"))
  ) {
    return "Cannot reach the server. Please check your internet connection.";
  }

  return "An unexpected error occurred. Please try again.";
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: { method?: string; body?: object; token?: string } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Server returned an unreadable response. Please try again.",
    );
  }

  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface CreateOwnerResponse {
  owner: {
    id: number;
    owner_name: string;
    company_name: string;
    phone: string;
  };
  business: { id: number; name: string; invitation_id: string };
}

export interface OwnerLoginResponse {
  token: string;
  role: "owner";
}

export interface OwnerProfileResponse {
  owner: {
    id: number;
    owner_name: string;
    company_name: string;
    phone: string;
  };
  business: { id: number; name: string; invitation_id: string };
}

export interface CreateEmployeeResponse {
  employee: {
    id: number;
    name: string;
    phone: string;
    business: { id: number; name: string };
  };
}

export interface EmployeeLoginResponse {
  token: string;
  role: "employee";
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  owners: {
    create: (payload: {
      owner_name: string;
      company_name: string;
      phone: string;
      password: string;
      password_confirmation: string;
    }) =>
      request<CreateOwnerResponse>("/owners", {
        method: "POST",
        body: { owner: payload },
      }),

    login: (phone: string, password: string) =>
      request<OwnerLoginResponse>("/owner_login", {
        method: "POST",
        body: { phone, password },
      }),

    profile: (token: string) =>
      request<OwnerProfileResponse>("/owners/me", { token }),

    list: (token: string) => request<any[]>("/owners", { token }),
  },

  employees: {
    create: (payload: {
      invitation_code: string;
      employee: {
        name: string;
        phone: string;
        password: string;
        password_confirmation: string;
      };
    }) =>
      request<CreateEmployeeResponse>("/employees", {
        method: "POST",
        body: payload,
      }),

    login: (phone: string, password: string) =>
      request<EmployeeLoginResponse>("/employee_login", {
        method: "POST",
        body: { phone, password },
      }),

    list: (token: string) => request<any[]>("/employees", { token }),
  },

  transactions: {
    create: (payload: object, token: string) =>
      request<any>("/transactions", {
        method: "POST",
        body: { transaction: payload },
        token,
      }),

    list: (token: string) => request<any[]>("/transactions", { token }),
  },
};
