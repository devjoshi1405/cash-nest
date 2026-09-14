export type WorkspaceType = "home" | "shop";

export type PaymentMethod =
  | "Cash"
  | "UPI"
  | "Bank"
  | "Credit Card"
  | "Debit Card"
  | "Card"
  | "Other";

export type TransactionType = "Income" | "Expense";

export type DateRangeFilter =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "custom";

export interface DateRange {
  from?: string;
  to?: string;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "warning" | "success" | "alert";
  workspace?: WorkspaceType;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  currency: string;
  role: string;
}
