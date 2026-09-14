import { PaymentMethod, TransactionType } from "./common";

export type HomeIncomeCategory =
  | "Salary"
  | "Bonus"
  | "Freelance"
  | "Interest"
  | "Business Income"
  | "Other";

export type HomeExpenseCategory =
  | "Kitchen"
  | "Groceries"
  | "Grocery"
  | "Electricity"
  | "Gas"
  | "Wi-Fi"
  | "Mobile Recharge"
  | "Petrol"
  | "Vehicle"
  | "EMI"
  | "Loan"
  | "Medical"
  | "Shopping"
  | "Entertainment"
  | "Education"
  | "Travel"
  | "Bills"
  | "Other";

export type HomeCategory = HomeIncomeCategory | HomeExpenseCategory | string;

export interface HomeTransaction {
  id: string;
  date: string;
  name: string;
  category: HomeCategory;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  notes?: string;
  createdAt?: string;
}

export interface HomeIncomeItem {
  id: string;
  date: string;
  source: string;
  category: HomeIncomeCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface HomeExpenseItem {
  id: string;
  date: string;
  title: string;
  category: HomeExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export type DebtDirection = "borrowed" | "lent";

export type BorrowLendStatus = "Unpaid" | "Partially Paid" | "Paid" | "Overdue";

export interface LoanPaymentHistory {
  id: string;
  debtId?: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt?: string;
}

export interface BorrowRecord {
  id: string;
  userId?: string;
  workspaceId?: string;
  direction?: "borrowed";
  personName: string;
  phone?: string;
  borrowedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  debtDate?: string;
  borrowDate: string;
  dueDate?: string | null;
  status: BorrowLendStatus;
  purpose?: string;
  payments: LoanPaymentHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LendRecord {
  id: string;
  userId?: string;
  workspaceId?: string;
  direction?: "lent";
  personName: string;
  phone?: string;
  lentAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  debtDate?: string;
  lendDate: string;
  dueDate?: string | null;
  status: BorrowLendStatus;
  purpose?: string;
  payments: LoanPaymentHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export type DebtRecord = BorrowRecord | LendRecord;

export interface DebtSummary {
  totalMoneyToPay: number;
  totalMoneyToReceive: number;
  overdueAmount: number;
  activeBorrowingsCount: number;
  activeLendingsCount: number;
  totalActiveCount: number;
}

export type BudgetStatus = "Safe" | "Near Limit" | "Exceeded";

export interface BudgetRecord {
  id: string;
  userId?: string;
  workspaceId?: string;
  categoryId?: string | null;
  category: HomeExpenseCategory | string;
  categoryIcon?: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage?: number;
  month: string; // "YYYY-MM"
  status: BudgetStatus;
  iconName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  overallStatus: BudgetStatus;
  categoriesCount: number;
  categoriesExceededCount: number;
  categoriesNearLimitCount: number;
  categoriesSafeCount: number;
}

export interface BudgetVsActualItem {
  category: string;
  icon?: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export interface MonthlyComparison {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface ExpenseCategoryDistribution {
  category: HomeExpenseCategory | string;
  amount: number;
  percentage: number;
  color?: string;
}

export interface HomeDashboardSummary {
  incomeThisMonth: number;
  incomeGrowthPct: number;
  expensesThisMonth: number;
  expensesGrowthPct: number;
  monthlySavings: number;
  moneyToPay: number;
  moneyToReceive: number;
}
