"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceType } from "@/types/common";

interface WorkspaceContextType {
  workspace: WorkspaceType;
  setWorkspace: (ws: WorkspaceType) => void;
  switchWorkspace: (ws: WorkspaceType) => void;
  workspaceName: string;
  workspaceIcon: string;
  accentColor: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [workspace, setWorkspaceState] = useState<WorkspaceType>("home");

  useEffect(() => {
    if (pathname.startsWith("/shop")) {
      setWorkspaceState("shop");
    } else if (pathname.startsWith("/home")) {
      setWorkspaceState("home");
    }
  }, [pathname]);

  const switchWorkspace = (targetWorkspace: WorkspaceType) => {
    setWorkspaceState(targetWorkspace);
    if (targetWorkspace === "home") {
      router.push("/home/dashboard");
    } else {
      router.push("/shop/dashboard");
    }
  };

  const workspaceName = workspace === "home" ? "Home Finance" : "Pan Shop Finance";
  const workspaceIcon = workspace === "home" ? "🏠" : "🏪";
  const accentColor = workspace === "home" ? "emerald" : "amber";

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        setWorkspace: setWorkspaceState,
        switchWorkspace,
        workspaceName,
        workspaceIcon,
        accentColor,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
