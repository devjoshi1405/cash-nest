"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getTodayDisplayDate } from "@/lib/date";
import { mockNotifications } from "@/data/settings";
import { Modal } from "@/components/shared/Modal";
import { Drawer } from "@/components/shared/Drawer";
import { getProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/supabase/types";
import {
  Bell,
  Search,
  Sun,
  Moon,
  Laptop,
  Menu,
  Check,
  User,
  Shield,
  CreditCard,
  ChevronDown,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

export interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, workspaceName, workspaceIcon } = useWorkspace();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const p = await getProfile();
        if (p) setProfile(p);
      } catch (err) {
        console.error("Failed to load header profile:", err);
      }
    }
    loadUserProfile();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Logged out successfully.");
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const displayName = profile?.full_name || "Devanshu Joshi";
  const displayEmail = profile?.user_id ? "Account Profile" : "devanshu@cashnest.app";
  const userInitials = displayName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CN";

  // Format page title from pathname
  const getPageTitle = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "Dashboard";
    const lastPart = parts[parts.length - 1];
    return lastPart
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const todayDate = getTodayDisplayDate();
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6">
        {/* Left Section: Mobile Menu + Title + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <span>{workspaceIcon}</span>
                <span>{workspaceName}</span>
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {getPageTitle()}
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              {todayDate}
            </span>
          </div>
        </div>

        {/* Right Section: Global Search, Notifications, Theme Toggle, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quick Search...</span>
            <kbd className="hidden sm:inline-block rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-300">
              ⌘K
            </kbd>
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>

          {/* Theme Dropdown Toggle */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-4.5 w-4.5 text-amber-400" />
              ) : (
                <Sun className="h-4.5 w-4.5 text-amber-500" />
              )}
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setTheme("light");
                    setIsThemeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                    theme === "light"
                      ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Sun className="h-3.5 w-3.5" /> Light
                  </span>
                  {theme === "light" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("dark");
                    setIsThemeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                    theme === "dark"
                      ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Moon className="h-3.5 w-3.5" /> Dark
                  </span>
                  {theme === "dark" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("system");
                    setIsThemeMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                    theme === "system"
                      ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Laptop className="h-3.5 w-3.5" /> System
                  </span>
                  {theme === "system" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </button>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Dropdown */}
          {/* User Profile Avatar & Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="User account menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs">
                {userInitials}
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400 mr-1 hidden sm:inline" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {displayEmail}
                  </div>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" /> Account Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <CreditCard className="h-4 w-4 text-slate-400" /> Preferences & Currency
                </Link>

                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick Search Modal */}
      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Quick Navigate & Search"
        description="Search across transactions, inventory products, suppliers, and reports."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Type to search (e.g., Groceries, Thums Up, Ramesh, Invoices)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 focus:outline-none"
            />
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quick Shortcuts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/home/transactions"
                onClick={() => setIsSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                🏠 Home Transactions
              </Link>
              <Link
                href="/shop/sales"
                onClick={() => setIsSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                🏪 Shop Daily Sales
              </Link>
              <Link
                href="/shop/inventory"
                onClick={() => setIsSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                📦 Shop Inventory
              </Link>
              <Link
                href="/home/budget"
                onClick={() => setIsSearchOpen(false)}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                📊 Monthly Budgets
              </Link>
            </div>
          </div>
        </div>
      </Modal>

      {/* Notifications Drawer */}
      <Drawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        title="Activity Notifications"
        description="Recent alerts, payment due reminders, and inventory stock notices."
        width="md"
      >
        <div className="space-y-3">
          {mockNotifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "p-3.5 rounded-xl border transition-all",
                n.read
                  ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/60 opacity-80"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {n.title}
                </h4>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {n.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {n.message}
              </p>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  {n.workspace === "home" ? "🏠 Home" : "🏪 Shop"}
                </span>
                {!n.read && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    New Alert
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </>
  );
}
