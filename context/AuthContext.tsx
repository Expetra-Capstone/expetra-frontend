import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as api from "../services/apiService";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TOKEN_KEY = "auth_token";
const ROLE_KEY = "auth_role";
const USER_KEY = "auth_user";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type Role = "owner" | "employee";

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  companyName?: string;
  business?: {
    id: number;
    name: string;
    invitation_id: string;
  };
  role: Role;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface RegisterOwnerResult extends AuthResult {
  invitationId?: string;
}

export interface RegisterOwnerData {
  accountType: "business";
  name: string;
  companyName: string;
  phone: string;
  password: string;
}

export interface RegisterEmployeeData {
  accountType: "team";
  name: string;
  phone: string;
  password: string;
  inviteId: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: Role | null;
  isLoading: boolean;
  login: (
    phone: string,
    password: string,
    accountType: "business" | "team",
  ) => Promise<AuthResult>;
  registerOwner: (data: RegisterOwnerData) => Promise<RegisterOwnerResult>;
  registerEmployee: (data: RegisterEmployeeData) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function saveSession(
  token: string,
  role: Role,
  user: AuthUser,
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(ROLE_KEY, role);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on app start ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedRole, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(ROLE_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (storedToken && storedRole && storedUser) {
          setToken(storedToken);
          setRole(storedRole as Role);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } catch {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const applySession = useCallback(
    async (t: string, r: Role, u: AuthUser): Promise<void> => {
      await saveSession(t, r, u);
      setToken(t);
      setRole(r);
      setUser(u);
    },
    [],
  );

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (
      phone: string,
      password: string,
      accountType: "business" | "team",
    ): Promise<AuthResult> => {
      const isOwner = accountType === "business";

      const loginResult = isOwner
        ? await api.ownerLogin(phone, password)
        : await api.employeeLogin(phone, password);

      if (loginResult.error) {
        return { success: false, error: loginResult.error };
      }

      const { token: t, role: r } = loginResult.data;

      if (isOwner) {
        // ── Owner: fetch full profile from /owners/me ──────────────────────
        const profileResult = await api.getOwnerProfile(t);

        if (profileResult.error) {
          // Token is valid but profile fetch failed — persist minimal data
          // so the user is still logged in and can retry later.
          await applySession(t, r, {
            id: 0,
            name: "",
            phone: phone.trim(),
            role: r,
          });
          return { success: true };
        }

        const { owner, business } = profileResult.data;
        await applySession(t, r, {
          id: owner.id,
          name: owner.owner_name,
          phone: owner.phone,
          companyName: owner.company_name,
          business,
          role: r,
        });
      } else {
        // ── Employee: fetch full profile from /employees/me ────────────────
        // FIX: previously this branch stored empty id/name, causing the
        // profile page to show blank data after an employee login.
        const profileResult = await api.getEmployeeProfile(t);

        if (profileResult.error) {
          // Token is valid but profile fetch failed — persist minimal data.
          await applySession(t, r, {
            id: 0,
            name: "",
            phone: phone.trim(),
            role: r,
          });
          return { success: true };
        }

        const emp = profileResult.data;
        await applySession(t, r, {
          id: emp.id,
          name: emp.name,
          phone: emp.phone ?? phone.trim(),
          business: emp.business
            ? {
                id: emp.business.id,
                name: emp.business.name,
                invitation_id: "",
              }
            : undefined,
          role: r,
        });
      }

      return { success: true };
    },
    [applySession],
  );

  // ── REGISTER OWNER (Business) ──────────────────────────────────────────────
  const registerOwner = useCallback(
    async (data: RegisterOwnerData): Promise<RegisterOwnerResult> => {
      const createResult = await api.createOwner({
        owner_name: data.name,
        company_name: data.companyName,
        phone: data.phone,
        password: data.password,
        password_confirmation: data.password,
      });

      if (createResult.error) {
        return { success: false, error: createResult.error };
      }

      const { owner, business } = createResult.data;

      const loginResult = await api.ownerLogin(data.phone, data.password);
      if (loginResult.error) {
        return { success: false, error: loginResult.error };
      }

      const { token: t, role: r } = loginResult.data;

      await applySession(t, r, {
        id: owner.id,
        name: owner.owner_name,
        phone: owner.phone,
        companyName: owner.company_name,
        business,
        role: r,
      });

      return { success: true, invitationId: business.invitation_id };
    },
    [applySession],
  );

  // ── REGISTER EMPLOYEE (Team) ───────────────────────────────────────────────
  const registerEmployee = useCallback(
    async (data: RegisterEmployeeData): Promise<AuthResult> => {
      const createResult = await api.createEmployee({
        invitation_code: data.inviteId,
        name: data.name,
        phone: data.phone,
        password: data.password,
        password_confirmation: data.password,
      });

      if (createResult.error) {
        return { success: false, error: createResult.error };
      }

      const emp = createResult.data;

      const loginResult = await api.employeeLogin(data.phone, data.password);
      if (loginResult.error) {
        return { success: false, error: loginResult.error };
      }

      const { token: t, role: r } = loginResult.data;

      await applySession(t, r, {
        id: emp.id,
        name: emp.name,
        phone: emp.phone ?? data.phone,
        business: emp.business
          ? {
              id: emp.business.id,
              name: emp.business.name,
              invitation_id: "",
            }
          : undefined,
        role: r,
      });

      return { success: true };
    },
    [applySession],
  );

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    await clearSession();
    setToken(null);
    setRole(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        login,
        registerOwner,
        registerEmployee,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
