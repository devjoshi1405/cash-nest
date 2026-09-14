"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { ChevronDown, Check, Home, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { workspace, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const workspaces = [
    {
      id: "home" as const,
      name: "Home Finance",
      icon: Home,
      symbol: "🏠",
      desc: "Personal & Household",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      id: "shop" as const,
      name: "Pan Shop Finance",
      icon: Store,
      symbol: "🏪",
      desc: "Retail & Counter Sales",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  const current = workspaces.find((w) => w.id === workspace) || workspaces[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-2.5 text-left transition-all hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs",
          compact && "p-2"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-medium shadow-xs",
              workspace === "home"
                ? "bg-emerald-600 text-white"
                : "bg-amber-600 text-white"
            )}
          >
            <CurrentIcon className="h-5 w-5" />
          </div>
          {!compact && (
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {current.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {current.desc}
              </p>
            </div>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Switch Workspace
          </div>
          <div className="space-y-1">
            {workspaces.map((ws) => {
              const isSelected = ws.id === workspace;
              const WsIcon = ws.icon;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg p-2 text-left text-sm transition-colors cursor-pointer",
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md text-xs",
                        ws.id === "home"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      )}
                    >
                      <WsIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{ws.name}</div>
                      <div className="text-[10px] text-slate-400">{ws.desc}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
