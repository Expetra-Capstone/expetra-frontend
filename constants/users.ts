export type AccountType = "personal" | "business" | "team";

export interface User {
  id: string;
  name: string;
  phone: string;
  password: string;
  accountType: AccountType;
  companyName?: string; // business
  inviteId?: string; // team
  createdAt: string;
}

// Mutable runtime array — swap with real API calls later
export const USERS_DB: User[] = [
  {
    id: "usr_001",
    name: "Alex Johnson",
    phone: "09222222222",
    password: "pass1234",
    accountType: "personal",
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr_002",
    name: "Sarah Business",
    phone: "09311122113",
    password: "business123",
    accountType: "business",
    companyName: "Expetra Corp",
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr_003",
    name: "Mike Team",
    phone: "09411122114",
    password: "team123",
    accountType: "team",
    inviteId: "EXPETRA-TEAM-001",
    createdAt: new Date().toISOString(),
  },
];
