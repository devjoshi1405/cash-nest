import { ProfitLossSummary } from "@/types/shop";

export const mockProfitLossSummaries: Record<string, ProfitLossSummary> = {
  monthly: {
    period: "monthly",
    revenue: 80000,
    cogs: 55000,
    grossProfit: 25000,
    shopExpenses: 8000,
    netProfit: 17000,
  },
  daily: {
    period: "daily",
    revenue: 6500,
    cogs: 4450,
    grossProfit: 2050,
    shopExpenses: 600,
    netProfit: 1450,
  },
  weekly: {
    period: "weekly",
    revenue: 44850,
    cogs: 30800,
    grossProfit: 14050,
    shopExpenses: 2000,
    netProfit: 12050,
  },
  yearly: {
    period: "yearly",
    revenue: 960000,
    cogs: 660000,
    grossProfit: 300000,
    shopExpenses: 96000,
    netProfit: 204000,
  },
};

export const mockProfitTrend = [
  { month: "Apr", revenue: 72000, cogs: 49500, grossProfit: 22500, expenses: 7500, netProfit: 15000 },
  { month: "May", revenue: 75000, cogs: 51800, grossProfit: 23200, expenses: 7800, netProfit: 15400 },
  { month: "Jun", revenue: 78000, cogs: 53500, grossProfit: 24500, expenses: 8000, netProfit: 16500 },
  { month: "Jul", revenue: 82000, cogs: 56500, grossProfit: 25500, expenses: 8200, netProfit: 17300 },
  { month: "Aug", revenue: 79000, cogs: 54200, grossProfit: 24800, expenses: 7900, netProfit: 16900 },
  { month: "Sep", revenue: 80000, cogs: 55000, grossProfit: 25000, expenses: 8000, netProfit: 17000 },
];
