"use client";

import React, { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Toaster } from "sonner";
import { useTheme } from "@/components/providers/ThemeProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sonner Toaster */}
      <Toaster
        position="top-right"
        richColors
        theme={resolvedTheme}
        toastOptions={{
          style: {
            borderRadius: "12px",
          },
        }}
      />

      {/* Desktop Fixed / Expandable Sidebar */}
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Mobile Drawer & Bottom Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header onOpenMobileNav={() => setIsMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
