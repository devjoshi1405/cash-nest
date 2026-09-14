"use client";

import React, { useState } from "react";
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AppSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  isCollapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
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

  const handleLogout = () => {
    toast.info("Simulated Logout: In Phase 2, this will end your authenticated session.");
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md h-screen sticky top-0 transition-all duration-300 z-30 shrink-0 select-none",
        isCollapsed ? "w-[76px]" : "w-[260px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 h-16">
        <Link href={workspace === "home" ? "/home/dashboard" : "/shop/dashboard"} className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-lg shadow-sm">
            CN
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                CashNest
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider -mt-1 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Finance Hub
              </span>
            </div>
          )}
        </Link>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <WorkspaceSwitcher compact={isCollapsed} />
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div className={cn("px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider", isCollapsed && "text-center")}>
          {isCollapsed ? "•••" : "Workspace Menu"}
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                isActive
                  ? workspace === "home"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              {isActive && (
                <div
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full",
                    workspace === "home" ? "bg-emerald-600" : "bg-amber-600"
                  )}
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive
                    ? workspace === "home"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )}
              />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions (Settings & Logout) */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
            pathname === "/settings" && "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0 text-slate-400" />
          {!isCollapsed && <span>Settings</span>}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Logout (Placeholder)" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
