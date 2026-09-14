export interface AppSettings {
  profile: {
    name: string;
    email: string;
    phone: string;
  };
  currency: {
    code: string;
    symbol: string;
  };
  appearance: "light" | "dark" | "system";
  homeSettings: {
    defaultSalary: number;
    startOfFinancialMonth: number; // 1 to 31
  };
  shopSettings: {
    shopName: string;
    shopPhone: string;
    shopAddress: string;
    openingBalance: number;
    gstNumber?: string;
  };
}
