import { PaymentMethod } from "./common";
export * from "./inventory";

export type ShopExpenseCategory =
  | "Rent"
  | "Electricity"
  | "Transport"
  | "Maintenance"
  | "Employee"
  | "Packaging"
  | "Equipment"
  | "Internet"
  | "Cleaning"
  | "License / Fees"
  | "Miscellaneous"
  | "Other"
  | string;

export type PurchasePaymentStatus = "Paid" | "Partially Paid" | "Pending";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type CustomerCreditStatus = "Pending" | "Partial" | "Paid" | "Overdue";

export interface DailySale {
  id: string;
  date: string;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  notes?: string;
  createdAt?: string;
}

export interface PurchaseRecord {
  id: string;
  workspaceId?: string;
  userId?: string;
  supplierId?: string;
  supplierName: string;
  purchaseDate: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PurchasePaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  itemsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  payments?: SupplierPayment[];
}

export interface ShopExpense {
  id: string;
  workspaceId?: string;
  userId?: string;
  date: string;
  title: string;
  category: ShopExpenseCategory;
  categoryId?: string | null;
  categoryIcon?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: "Pcs" | "Box" | "Pack" | "Bottle" | "Kg" | "Ltr";
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number;
  status: StockStatus;
  minThreshold: number;
  lastRestocked?: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  date: string;
  type: "addition" | "deduction" | "damage";
  quantity: number;
  reason: string;
}

export interface SupplierPayment {
  id: string;
  workspaceId?: string;
  userId?: string;
  supplierId: string;
  purchaseId?: string | null;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  billNumber?: string;
  notes?: string;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  workspaceId?: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  category: string;
  notes?: string;
  isActive?: boolean;
  totalPurchases: number;
  totalPaid: number;
  pendingAmount: number;
  lastPurchaseDate: string;
  purchasesCount: number;
  paymentHistory?: SupplierPayment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerCreditPayment {
  id: string;
  userId?: string;
  customerCreditId?: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt?: string;
}

export interface CustomerCredit {
  id: string;
  workspaceId?: string;
  userId?: string;
  customerName: string;
  phone?: string;
  creditDate?: string;
  creditAmount: number;
  amountReceived: number;
  remainingAmount: number;
  lastPaymentDate?: string;
  dueDate?: string;
  status: CustomerCreditStatus;
  notes?: string;
  isArchived?: boolean;
  isOverdue?: boolean;
  dueDateStatus?: string;
  settledDate?: string;
  createdAt?: string;
  updatedAt?: string;
  payments?: CustomerCreditPayment[];
}

export interface CustomerCreditInput {
  workspaceId: string;
  customerName: string;
  phone?: string;
  creditAmount: number;
  creditDate?: string;
  dueDate?: string;
  notes?: string;
  initialPayment?: number;
  paymentMethod?: PaymentMethod;
}

export interface CustomerCreditUpdateInput {
  id: string;
  customerName: string;
  phone?: string;
  creditAmount: number;
  creditDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface CustomerCreditPaymentInput {
  creditId: string;
  amount: number;
  date?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface CustomerCreditPaymentUpdateInput {
  paymentId: string;
  amount: number;
  date?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface CustomerOutstandingSummary {
  customerName: string;
  phone?: string;
  totalCredit: number;
  totalReceived: number;
  outstanding: number;
  creditsCount: number;
  oldestDueDate?: string;
  status: CustomerCreditStatus;
  lastPaymentDate?: string;
}

export interface CustomerCreditSummary {
  totalOutstanding: number;
  totalReceivedThisMonth: number;
  totalOverdue: number;
  pendingCustomersCount: number;
  totalCreditExtended: number;
  totalCollected: number;
  totalActiveCredits: number;
  overdueCreditsCount: number;
}

export type CustomerCreditSortOption =
  | "newest"
  | "oldest"
  | "highest-credit"
  | "lowest-credit"
  | "highest-remaining"
  | "due-soon"
  | "most-overdue"
  | "customer-az";

export type CustomerCreditFilterStatus = "all" | "pending" | "partial" | "paid" | "overdue";
export type CustomerCreditDueFilter = "all" | "overdue" | "due-today" | "upcoming" | "no-due-date";

export interface ProfitLossSummary {
  period: "daily" | "weekly" | "monthly" | "yearly";
  revenue: number;
  cogs: number;
  grossProfit: number;
  shopExpenses: number;
  netProfit: number;
}

export interface ShopDashboardSummary {
  todaySales: number;
  cashSales: number;
  onlineSales: number;
  todayExpenses: number;
  estimatedTodayProfit: number;
  pendingSupplierPayments: number;
}
