export * from "./database.types";
import { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Debt = Database["public"]["Tables"]["debts"]["Row"];
export type DebtPayment = Database["public"]["Tables"]["debt_payments"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type DailySale = Database["public"]["Tables"]["daily_sales"]["Row"];
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type Purchase = Database["public"]["Tables"]["purchases"]["Row"];
export type SupplierPayment = Database["public"]["Tables"]["supplier_payments"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type InventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Row"];
export type CustomerCredit = Database["public"]["Tables"]["customer_credits"]["Row"];
export type CustomerCreditPayment = Database["public"]["Tables"]["customer_credit_payments"]["Row"];
