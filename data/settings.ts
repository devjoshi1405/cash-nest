import { AppSettings } from "@/types/settings";
import { NotificationItem } from "@/types/common";

export const defaultAppSettings: AppSettings = {
  profile: {
    name: "Devanshu Joshi",
    email: "devanshu@cashnest.app",
    phone: "+91 98765 00112",
  },
  currency: {
    code: "INR",
    symbol: "₹",
  },
  appearance: "system",
  homeSettings: {
    defaultSalary: 15500,
    startOfFinancialMonth: 1,
  },
  shopSettings: {
    shopName: "Shiv Kripa Pan & Beverage Corner",
    shopPhone: "+91 98220 99881",
    shopAddress: "Shop No. 3, Main Market Chowk, Near City Bus Stand",
    openingBalance: 5000,
    gstNumber: "27AAAAA0000A1Z5",
  },
};

export const mockNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Supplier Payment Due Soon",
    message: "Pending balance of ₹4,000 for Raj Cold Drinks due by 20 Sep 2026.",
    timestamp: "10 mins ago",
    read: false,
    type: "warning",
    workspace: "shop",
  },
  {
    id: "notif-2",
    title: "Low Stock Alert",
    message: "Lay's India's Magic Masala (52g) has only 4 packs remaining in stock.",
    timestamp: "1 hour ago",
    read: false,
    type: "alert",
    workspace: "shop",
  },
  {
    id: "notif-3",
    title: "Entertainment Budget Near Limit",
    message: "You have spent 118% of your monthly entertainment budget.",
    timestamp: "5 hours ago",
    read: true,
    type: "warning",
    workspace: "home",
  },
  {
    id: "notif-4",
    title: "Borrow Repayment Reminder",
    message: "Ramesh Sharma borrow payment ₹3,000 remaining due on 25 Sep.",
    timestamp: "Yesterday",
    read: true,
    type: "info",
    workspace: "home",
  },
];
