import { AccountType, AuthUser } from "@/constants/users";
import { api, parseApiError } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY = "@expetra_token";
const USER_KEY = "@expetra_user";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterData {
  accountType: AccountType;
  name: string;
  phone: string;
  password: string;
  companyName?: string;
  inviteId?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (
    phone: string,
    password: string,
    accountType: AccountType,
  ) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // Corrupt storage — start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistSession = async (t: string, u: AuthUser) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, t),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(u)),
    ]);
    setToken(t);
    setUser(u);
  };

  // ── Login ───────────────────────────────────────────────────────────────────

  const login = useCallback(
    async (
      phone: string,
      password: string,
      accountType: AccountType,
    ): Promise<AuthResult> => {
      try {
        if (accountType === "business") {
          // Step 1: Login to get token
          const loginRes = await api.owners.login(phone, password);

          if (__DEV__) console.log("[Auth] Owner login response:", loginRes);

          // Step 2: Fetch profile — FIX: handle profile failure gracefully
          let authUser: AuthUser;
          try {
            const profileRes = await api.owners.profile(loginRes.token);

            if (__DEV__)
              console.log("[Auth] Owner profile response:", profileRes);

            authUser = {
              id: String(profileRes.owner.id),
              name: profileRes.owner.owner_name,
              phone: profileRes.owner.phone,
              accountType: "business",
              role: "owner",
              companyName: profileRes.owner.company_name,
              businessId: profileRes.business?.id,
              invitationId: profileRes.business?.invitation_id,
            };
          } catch (profileErr) {
            // Profile fetch failed but login succeeded — use minimal user data
            if (__DEV__)
              console.warn("[Auth] Profile fetch failed:", profileErr);
            authUser = {
              id: "owner",
              name: "",
              phone,
              accountType: "business",
              role: "owner",
            };
          }

          await persistSession(loginRes.token, authUser);
          return { success: true };
        } else {
          // Employee login (covers "team" and "personal" tabs)
          const loginRes = await api.employees.login(phone, password);

          if (__DEV__) console.log("[Auth] Employee login response:", loginRes);

          const authUser: AuthUser = {
            id: "employee",
            name: "",
            phone,
            accountType,
            role: "employee",
          };

          await persistSession(loginRes.token, authUser);
          return { success: true };
        }
      } catch (error) {
        if (__DEV__) console.error("[Auth] Login error:", error);
        return { success: false, error: parseApiError(error) };
      }
    },
    [],
  );

  // ── Register ────────────────────────────────────────────────────────────────

  const register = useCallback(
    async (data: RegisterData): Promise<AuthResult> => {
      try {
        if (data.accountType === "business") {
          if (!data.companyName?.trim()) {
            return { success: false, error: "Company name is required." };
          }

          // Step 1: Create owner account
          const createRes = await api.owners.create({
            owner_name: data.name,
            company_name: data.companyName,
            phone: data.phone,
            password: data.password,
            // FIX: password_confirmation must exactly match — use same value
            password_confirmation: data.password,
          });

          if (__DEV__) console.log("[Auth] Owner create response:", createRes);

          // Step 2: Auto-login — FIX: wrapped separately so create success
          // is not lost if login fails for any reason
          let jwtToken: string;
          try {
            const loginRes = await api.owners.login(data.phone, data.password);
            jwtToken = loginRes.token;
          } catch (loginErr) {
            if (__DEV__)
              console.error(
                "[Auth] Auto-login after register failed:",
                loginErr,
              );
            return {
              success: false,
              error:
                "Account created! But auto-login failed. Please log in manually.",
            };
          }

          // Step 3: Build user from create response — FIX: use createRes
          // directly, don't rely on profile endpoint here
          const authUser: AuthUser = {
            id: String(createRes.owner?.id ?? Date.now()),
            name: createRes.owner?.owner_name ?? data.name,
            phone: createRes.owner?.phone ?? data.phone,
            accountType: "business",
            role: "owner",
            companyName: createRes.owner?.company_name ?? data.companyName,
            businessId: createRes.business?.id,
            invitationId: createRes.business?.invitation_id,
          };

          await persistSession(jwtToken, authUser);
          return { success: true };
        } else if (data.accountType === "team") {
          if (!data.inviteId?.trim()) {
            return { success: false, error: "Invite ID is required." };
          }

          // Step 1: Create employee
          const createRes = await api.employees.create({
            invitation_code: data.inviteId,
            employee: {
              name: data.name,
              phone: data.phone,
              password: data.password,
              // FIX: same as above — use same password value
              password_confirmation: data.password,
            },
          });

          if (__DEV__)
            console.log("[Auth] Employee create response:", createRes);

          // Step 2: Auto-login — FIX: wrapped separately
          let jwtToken: string;
          try {
            const loginRes = await api.employees.login(
              data.phone,
              data.password,
            );
            jwtToken = loginRes.token;
          } catch (loginErr) {
            if (__DEV__)
              console.error("[Auth] Employee auto-login failed:", loginErr);
            return {
              success: false,
              error:
                "Account created! But auto-login failed. Please log in manually.",
            };
          }

          // FIX: defensive access — employee response structure varies
          const emp = createRes?.employee ?? (createRes as any);
          const authUser: AuthUser = {
            id: String(emp?.id ?? Date.now()),
            name: emp?.name ?? data.name,
            phone: emp?.phone ?? data.phone,
            accountType: "team",
            role: "employee",
            companyName: emp?.business?.name,
            businessId: emp?.business?.id,
          };

          await persistSession(jwtToken, authUser);
          return { success: true };
        } else {
          return {
            success: false,
            error:
              "Personal account sign-up is not available. Register as a Business owner or use a Team invite code.",
          };
        }
      } catch (error) {
        if (__DEV__) console.error("[Auth] Register error:", error);
        return { success: false, error: parseApiError(error) };
      }
    },
    [],
  );

  // ── Logout ──────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
