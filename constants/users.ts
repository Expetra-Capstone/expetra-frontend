export type AccountType = "personal" | "business" | "team";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  accountType: AccountType;
  role: "owner" | "employee";
  companyName?: string;
  businessId?: number;
  invitationId?: string; // only for owners
}
