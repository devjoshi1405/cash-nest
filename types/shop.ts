import { PaymentMethod } from "./common";

export type ShopExpenseCategory =
  | "Rent"
  | "Electricity"
  | "Transport"
  | "Maintenance"
  | "Employee"
  | "Packaging"
  | "Equipment"
  | "Internet"
  | "Other";

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
}

export interface ShopExpense {
  id: string;
  date: string;
  title: string;
  category: ShopExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
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
  supplierId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  billNumber?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  category: string;
  totalPurchases: number;
  totalPaid: number;
  pendingAmount: number;
  lastPurchaseDate: string;
  purchasesCount: number;
  paymentHistory?: SupplierPayment[];
}

export interface CustomerCreditPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CustomerCredit {
  id: string;
  customerName: string;
  phone?: string;
  creditAmount: number;
  amountReceived: number;
  remainingAmount: number;
  lastPaymentDate?: string;
  dueDate?: string;
  status: CustomerCreditStatus;
  notes?: string;
  payments?: CustomerCreditPayment[];
}

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
