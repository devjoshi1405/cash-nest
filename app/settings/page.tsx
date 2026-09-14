"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTheme } from "@/components/providers/ThemeProvider";
import { defaultAppSettings } from "@/data/settings";
import { AppSettings } from "@/types/settings";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  User,
  DollarSign,
  Sun,
  Moon,
  Laptop,
  Home,
  Store,
  Database,
  Save,
  Download,
  UploadCloud,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleProfileChange = (field: keyof AppSettings["profile"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }));
  };

  const handleHomeSettingsChange = (
    field: keyof AppSettings["homeSettings"],
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      homeSettings: { ...prev.homeSettings, [field]: value },
    }));
  };

  const handleShopSettingsChange = (
    field: keyof AppSettings["shopSettings"],
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      shopSettings: { ...prev.shopSettings, [field]: value },
    }));
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Settings and preferences saved successfully!");
  };

  const handleExportData = () => {
    toast.info("Simulated Data Export: Full JSON backup created for download.");
  };

  const handleBackupCloud = () => {
    toast.info("Simulated Cloud Backup: In Phase 2, this will sync your data with Supabase.");
  };

  const handleResetConfirm = () => {
    setSettings(defaultAppSettings);
    toast.success("Settings restored to defaults.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application Settings"
        description="Configure personal details, currency formatting, workspace defaults, and system appearance."
        badge="⚙️ Global Configuration"
      />

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Profile Section */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="h-5 w-5 text-slate-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                User Profile
              </h3>
              <p className="text-xs text-slate-400">Personal contact and identity information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={settings.profile.name}
                onChange={(e) => handleProfileChange("name", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={settings.profile.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={settings.profile.phone}
                onChange={(e) => handleProfileChange("phone", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Currency & Appearance Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Currency */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Currency Format
                </h3>
                <p className="text-xs text-slate-400">Primary financial denomination</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Active Currency
              </label>
              <select
                disabled
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold cursor-not-allowed"
              >
                <option value="INR">Indian Rupee (INR ₹) - Default</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Formatted with Indian numbering grouping (Lakhs & Crores)
              </p>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sun className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Theme & Appearance
                </h3>
                <p className="text-xs text-slate-400">Choose light, dark, or system mode</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                  theme === "light"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Sun className="h-4.5 w-4.5" /> Light Mode
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                  theme === "dark"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Moon className="h-4.5 w-4.5" /> Dark Mode
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                  theme === "system"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Laptop className="h-4.5 w-4.5" /> System Sync
              </button>
            </div>
          </div>
        </div>

        {/* Home & Shop Specific Configurations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Home Finance Settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Home className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Home Finance Settings
                </h3>
                <p className="text-xs text-slate-400">Salary baseline and monthly cycle</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Expected Monthly Salary (₹)
                </label>
                <input
                  type="number"
                  value={settings.homeSettings.defaultSalary}
                  onChange={(e) =>
                    handleHomeSettingsChange("defaultSalary", Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Financial Month Start Day (1 - 31)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={settings.homeSettings.startOfFinancialMonth}
                  onChange={(e) =>
                    handleHomeSettingsChange(
                      "startOfFinancialMonth",
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Shop Finance Settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Store className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pan Shop Settings
                </h3>
                <p className="text-xs text-slate-400">Store branding and counter opening cash</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shop Commercial Name
                </label>
                <input
                  type="text"
                  value={settings.shopSettings.shopName}
                  onChange={(e) =>
                    handleShopSettingsChange("shopName", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Counter Opening Float Balance (₹)
                </label>
                <input
                  type="number"
                  value={settings.shopSettings.openingBalance}
                  onChange={(e) =>
                    handleShopSettingsChange(
                      "openingBalance",
                      Number(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Shop Address / Location
                </label>
                <input
                  type="text"
                  value={settings.shopSettings.shopAddress}
                  onChange={(e) =>
                    handleShopSettingsChange("shopAddress", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data & Backup Placeholders */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Database className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Data Management & Backups
              </h3>
              <p className="text-xs text-slate-400">Local and cloud data synchronization</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" /> Export Complete JSON Backup
            </button>

            <button
              type="button"
              onClick={handleBackupCloud}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" /> Sync Cloud Backup
            </button>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 px-4 py-2.5 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer ml-auto"
            >
              <Trash2 className="h-4 w-4" /> Reset Default Settings
            </button>
          </div>
        </div>

        {/* Form Submission */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-3 text-xs font-bold shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" /> Save All Preferences
          </button>
        </div>
      </form>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset Settings to Defaults"
        message="Are you sure you want to reset your preferences to default values? Your transaction data will remain unchanged."
        confirmLabel="Reset Defaults"
        isDestructive
      />
    </div>
  );
}
