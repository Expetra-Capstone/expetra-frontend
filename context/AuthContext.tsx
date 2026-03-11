import { AccountType, User, USERS_DB } from "@/constants/users";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface AuthResult {
  success: boolean;
  error?: string;
}

interface RegisterPersonalData {
  accountType: "personal";
  name: string;
  phone: string;
  password: string;
}

interface RegisterBusinessData {
  accountType: "business";
  name: string;
  phone: string;
  password: string;
  companyName: string;
}

interface RegisterTeamData {
  accountType: "team";
  name: string;
  phone: string;
  password: string;
  inviteId: string;
}

export type RegisterData =
  | RegisterPersonalData
  | RegisterBusinessData
  | RegisterTeamData;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    phone: string,
    password: string,
    accountType: AccountType,
  ) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AUTH_KEY = "@auth_user_id";
const AuthContext = createContext<AuthContextType | null>(null);

// ─── PROVIDER ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then((id) => {
      if (id) setUser(USERS_DB.find((u) => u.id === id) ?? null);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(
    async (
      phone: string,
      password: string,
      accountType: AccountType,
    ): Promise<AuthResult> => {
      const found = USERS_DB.find(
        (u) =>
          u.phone === phone.trim() &&
          u.password === password &&
          u.accountType === accountType,
      );
      if (!found) {
        return {
          success: false,
          error: "Invalid phone number, password, or account type.",
        };
      }
      await AsyncStorage.setItem(AUTH_KEY, found.id);
      setUser(found);
      return { success: true };
    },
    [],
  );

  const register = useCallback(
    async (data: RegisterData): Promise<AuthResult> => {
      // Duplicate phone check
      if (USERS_DB.find((u) => u.phone === data.phone.trim())) {
        return {
          success: false,
          error: "An account with this phone number already exists.",
        };
      }

      // Team: validate invite ID
      if (data.accountType === "team" && data.inviteId.trim().length < 4) {
        return { success: false, error: "Invite ID is invalid." };
      }

      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: data.name.trim(),
        phone: data.phone.trim(),
        password: data.password,
        accountType: data.accountType,
        ...(data.accountType === "business" && {
          companyName: data.companyName,
        }),
        ...(data.accountType === "team" && { inviteId: data.inviteId }),
        createdAt: new Date().toISOString(),
      };

      USERS_DB.push(newUser);
      await AsyncStorage.setItem(AUTH_KEY, newUser.id);
      setUser(newUser);
      return { success: true };
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
