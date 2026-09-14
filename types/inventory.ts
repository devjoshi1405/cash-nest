export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "adjustment_in"
  | "adjustment_out"
  | "opening_stock"
  | "return_in"
  | "return_out";

export type MovementDirection = "in" | "out";

export interface Product {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
  inventoryValue: number;
  unitMargin: number;
  marginPercentage: number;
  status: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  category?: string;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  openingStock?: number;
  lowStockThreshold?: number;
  notes?: string;
}

export interface InventoryMovementRecord {
  id: string;
  workspaceId: string;
  userId: string;
  productId: string;
  productName?: string;
  productUnit?: string;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  movementDate: string;
  createdAt: string;
  direction: MovementDirection;
}

export interface PurchaseItemRecord {
  id: string;
  workspaceId: string;
  userId: string;
  purchaseId: string;
  productId: string;
  productName: string;
  productUnit: string;
  category?: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
  itemId?: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalUnitsInStock: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export interface CategoryInventoryValue {
  category: string;
  productCount: number;
  totalStockUnits: number;
  inventoryValue: number;
  percentage: number;
  color?: string;
}

export interface StockMovementSummary {
  stockAddedCount: number;
  stockAddedValue: number;
  stockRemovedCount: number;
  stockRemovedValue: number;
  netMovementValue: number;
  movementsCount: number;
}

// -------------------------------------------------------------
// Pure Calculation Helpers
// -------------------------------------------------------------

export function calculateInventoryValue(currentStock: number, purchasePrice: number): number {
  const stock = Math.max(0, Number(currentStock) || 0);
  const price = Math.max(0, Number(purchasePrice) || 0);
  return Math.round(stock * price * 100) / 100;
}

export function calculateUnitMargin(sellingPrice: number, purchasePrice: number): number {
  const sell = Number(sellingPrice) || 0;
  const buy = Number(purchasePrice) || 0;
  return Math.round((sell - buy) * 100) / 100;
}

export function calculateMarginPercentage(sellingPrice: number, purchasePrice: number): number {
  const sell = Number(sellingPrice) || 0;
  const buy = Number(purchasePrice) || 0;
  if (buy <= 0) return 0;
  return Math.round(((sell - buy) / buy) * 1000) / 10;
}

export function getStockStatus(currentStock: number, lowStockThreshold: number | null = 5): StockStatus {
  const stock = Number(currentStock) || 0;
  const threshold = lowStockThreshold !== null && lowStockThreshold !== undefined ? Number(lowStockThreshold) : 5;

  if (stock <= 0) {
    return "Out of Stock";
  }
  if (stock <= threshold) {
    return "Low Stock";
  }
  return "In Stock";
}

export function getMovementDirection(movementType: InventoryMovementType | string): MovementDirection {
  switch (movementType) {
    case "opening_stock":
    case "purchase":
    case "adjustment_in":
    case "return_in":
      return "in";
    case "sale":
    case "adjustment_out":
    case "return_out":
    default:
      return "out";
  }
}

export const COMMON_PAN_SHOP_CATEGORIES = [
  "Cold Drinks",
  "Chips & Snacks",
  "Water Bottle",
  "Chocolates & Candy",
  "Mouth Freshener",
  "Pan & Fresh Items",
  "Cigarettes & Tobacco",
  "Energy Drinks",
  "Biscuits & Bakery",
  "Tea & Coffee",
  "Personal Care",
  "Accessories",
  "Other",
] as const;

export const COMMON_PRODUCT_UNITS = [
  "Bottle",
  "Can",
  "Piece",
  "Packet",
  "Box",
  "Pouch",
  "Kg",
  "Gram",
  "Liter",
  "Ml",
  "Dozen",
  "Other",
] as const;
