import { ShopExpense } from "@/types/shop";

export const mockShopExpenses: ShopExpense[] = [
  {
    id: "sexp-1",
    date: "2026-09-01",
    title: "Shop Monthly Rent",
    category: "Rent",
    amount: 4500,
    paymentMethod: "Bank",
    notes: "Main road shop premise rent to landlord",
  },
  {
    id: "sexp-2",
    date: "2026-09-05",
    title: "Commercial Electricity Bill",
    category: "Electricity",
    amount: 1400,
    paymentMethod: "UPI",
    notes: "Shop refrigerator & signage lighting power bill",
  },
  {
    id: "sexp-3",
    date: "2026-09-08",
    title: "Helper / Counter Assistant Wage",
    category: "Employee",
    amount: 1000,
    paymentMethod: "Cash",
    notes: "Weekly advance for helper Raju",
  },
  {
    id: "sexp-4",
    date: "2026-09-10",
    title: "Packaging Paper Bags & Betel Pouches",
    category: "Packaging",
    amount: 450,
    paymentMethod: "Cash",
    notes: "Printed paper pouches & carry bags",
  },
  {
    id: "sexp-5",
    date: "2026-09-12",
    title: "Deep Freezer Gas Top-up & Servicing",
    category: "Maintenance",
    amount: 350,
    paymentMethod: "UPI",
    notes: "Compressor coil cleaning and refrigerant check",
  },
  {
    id: "sexp-6",
    date: "2026-09-14",
    title: "Shop Wi-Fi & Soundbox SIM",
    category: "Internet",
    amount: 300,
    paymentMethod: "UPI",
    notes: "Paytm Soundbox 4G SIM recharge",
  },
];

export const mockShopExpenseSummary = {
  totalExpensesThisMonth: 8000,
  mostExpensiveCategory: "Shop Rent (₹4,500)",
  dailyAverage: 266,
};

export const mockShopExpenseCategoryDistributions = [
  { category: "Rent", amount: 4500, percentage: 56.2, color: "#6366F1" },
  { category: "Electricity", amount: 1400, percentage: 17.5, color: "#F59E0B" },
  { category: "Employee", amount: 1000, percentage: 12.5, color: "#10B981" },
  { category: "Packaging", amount: 450, percentage: 5.6, color: "#EC4899" },
  { category: "Maintenance", amount: 350, percentage: 4.4, color: "#06B6D4" },
  { category: "Internet", amount: 300, percentage: 3.8, color: "#8B5CF6" },
];
