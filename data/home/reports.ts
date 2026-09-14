import { MonthlyComparison } from "@/types/home";

export const mockHomeMonthlyComparisons: MonthlyComparison[] = [
  { month: "Apr", income: 24000, expenses: 16800, savings: 7200 },
  { month: "May", income: 24500, expenses: 18200, savings: 6300 },
  { month: "Jun", income: 25000, expenses: 17100, savings: 7900 },
  { month: "Jul", income: 26000, expenses: 19500, savings: 6500 },
  { month: "Aug", income: 25350, expenses: 18100, savings: 7250 },
  { month: "Sep", income: 25000, expenses: 17400, savings: 7600 },
];

export const mockHomeSpendingTrend = [
  { day: "01 Sep", amount: 1200 },
  { day: "03 Sep", amount: 3200 },
  { day: "05 Sep", amount: 1850 },
  { day: "07 Sep", amount: 650 },
  { day: "09 Sep", amount: 1250 },
  { day: "11 Sep", amount: 588 },
  { day: "13 Sep", amount: 2300 },
  { day: "14 Sep", amount: 1000 },
];

export const mockHomePaymentMethodDistribution = [
  { name: "UPI", value: 8900, percentage: 51.1, color: "#10B981" },
  { name: "Bank Transfer", value: 3200, percentage: 18.4, color: "#3B82F6" },
  { name: "Credit Card", value: 3870, percentage: 22.2, color: "#8B5CF6" },
  { name: "Cash", value: 1430, percentage: 8.3, color: "#F59E0B" },
];
