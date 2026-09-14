"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  HandCoins,
  PiggyBank,
  BarChart3,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  CreditCard,
  LineChart,
  Settings,
  X,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAction?: () => void;
}

export function MobileNav({ isOpen, onClose, onQuickAction }: MobileNavProps) {
  const pathname = usePathname();
  const { workspace } = useWorkspace();

  const homeNavItems = [
    { name: "Dashboard", href: "/home/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/home/transactions", icon: ArrowLeftRight },
    { name: "Income", href: "/home/income", icon: TrendingUp },
    { name: "Expenses", href: "/home/expenses", icon: TrendingDown },
    { name: "Borrow & Lend", href: "/home/borrow-lend", icon: HandCoins },
    { name: "Budget", href: "/home/budget", icon: PiggyBank },
    { name: "Reports", href: "/home/reports", icon: BarChart3 },
  ];

  const shopNavItems = [
    { name: "Dashboard", href: "/shop/dashboard", icon: LayoutDashboard },
    { name: "Daily Sales", href: "/shop/sales", icon: ShoppingCart },
    { name: "Purchases", href: "/shop/purchases", icon: Receipt },
    { name: "Shop Expenses", href: "/shop/expenses", icon: TrendingDown },
    { name: "Inventory", href: "/shop/inventory", icon: Package },
    { name: "Suppliers", href: "/shop/suppliers", icon: Users },
    { name: "Customer Credit", href: "/shop/customer-credit", icon: CreditCard },
    { name: "Profit & Loss", href: "/shop/profit-loss", icon: LineChart },
    { name: "Reports", href: "/shop/reports", icon: BarChart3 },
  ];

  const navItems = workspace === "home" ? homeNavItems : shopNavItems;

  // Mobile Bottom Bar items
  const bottomBarItems =
    workspace === "home"
      ? [
          { name: "Dashboard", href: "/home/dashboard", icon: LayoutDashboard },
          { name: "Transactions", href: "/home/transactions", icon: ArrowLeftRight },
          { name: "Borrow/Lend", href: "/home/borrow-lend", icon: HandCoins },
          { name: "Budget", href: "/home/budget", icon: PiggyBank },
          { name: "Reports", href: "/home/reports", icon: BarChart3 },
        ]
      : [
          { name: "Dashboard", href: "/shop/dashboard", icon: LayoutDashboard },
          { name: "Daily Sales", href: "/shop/sales", icon: ShoppingCart },
          { name: "Purchases", href: "/shop/purchases", icon: Receipt },
          { name: "Inventory", href: "/shop/inventory", icon: Package },
          { name: "Profit/Loss", href: "/shop/profit-loss", icon: LineChart },
        ];

  return (
    <>
      {/* Slide-out Drawer for Full Navigation */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          />
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
                    CN
                  </div>
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    CashNest
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Workspace Switcher */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                <WorkspaceSwitcher />
              </div>

              {/* Nav links */}
              <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 text-slate-400" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bottom settings */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Settings className="h-4.5 w-4.5 text-slate-400" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md md:hidden px-2 py-1.5 shadow-lg">
        <div className="flex items-center justify-around">
          {bottomBarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors",
                  isActive
                    ? workspace === "home"
                      ? "text-emerald-600 dark:text-emerald-400 font-bold"
                      : "text-amber-600 dark:text-amber-400 font-bold"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                <span className="truncate max-w-[60px]">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
