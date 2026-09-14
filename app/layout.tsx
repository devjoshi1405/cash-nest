import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider";
import { DashboardShell } from "@/components/layout/DashboardShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CashNest — Finance Management Dashboard",
  description: "Unified finance hub for Home Personal Finance and Pan Shop Retail Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased">
        <ThemeProvider>
          <WorkspaceProvider>
            <DashboardShell>{children}</DashboardShell>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
