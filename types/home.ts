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

export type HomeCategory = HomeIncomeCategory | HomeExpenseCategory;

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

export type BorrowLendStatus = "Unpaid" | "Partially Paid" | "Paid" | "Overdue";

export interface LoanPaymentHistory {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface BorrowRecord {
  id: string;
  personName: string;
  phone?: string;
  borrowedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  borrowDate: string;
  dueDate: string;
  status: BorrowLendStatus;
  purpose?: string;
  payments: LoanPaymentHistory[];
}

export interface LendRecord {
  id: string;
  personName: string;
  phone?: string;
  lentAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  lendDate: string;
  dueDate: string;
  status: BorrowLendStatus;
  purpose?: string;
  payments: LoanPaymentHistory[];
}

export type BudgetStatus = "Safe" | "Near Limit" | "Exceeded";

export interface BudgetRecord {
  id: string;
  category: HomeExpenseCategory;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  month: string; // "YYYY-MM"
  status: BudgetStatus;
  iconName?: string;
}

export interface MonthlyComparison {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface ExpenseCategoryDistribution {
  category: HomeExpenseCategory;
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
