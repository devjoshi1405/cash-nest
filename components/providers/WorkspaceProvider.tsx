"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceType } from "@/types/common";
import { Workspace } from "@/lib/supabase/types";
import { getWorkspaces } from "@/lib/data/workspaces";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceContextType {
  workspace: WorkspaceType;
  setWorkspace: (ws: WorkspaceType) => void;
  switchWorkspace: (ws: WorkspaceType) => void;
  workspaceName: string;
  workspaceIcon: string;
  accentColor: string;
  workspaceId?: string;
  workspacesList: Workspace[];
  isLoadingWorkspaces: boolean;
  refetchWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Compute workspace type from URL
  const activeType: WorkspaceType = pathname?.startsWith("/shop") ? "shop" : "home";
  const [overrideWorkspace, setOverrideWorkspace] = useState<WorkspaceType | null>(null);
  const workspace = overrideWorkspace ?? activeType;

  const [workspacesList, setWorkspacesList] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await getWorkspaces();
      if (data && data.length > 0) {
        setWorkspacesList(data);
      }
    } catch (err) {
      console.error("Failed to load workspaces from Supabase:", err);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, []);

  // Fetch workspaces on mount and subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;
    getWorkspaces().then((data) => {
      if (isMounted && data && data.length > 0) {
        setWorkspacesList(data);
        setIsLoadingWorkspaces(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoadingWorkspaces(false);
    });

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        loadWorkspaces();
      } else if (event === "SIGNED_OUT") {
        setWorkspacesList([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadWorkspaces]);

  const switchWorkspace = (targetWorkspace: WorkspaceType) => {
    setOverrideWorkspace(targetWorkspace);
    if (targetWorkspace === "home") {
      router.push("/home/dashboard");
    } else {
      router.push("/shop/dashboard");
    }
  };

  const activeRecord = workspacesList.find((w) => w.type === workspace);
  const workspaceName = activeRecord?.name || (workspace === "home" ? "Home Finance" : "Pan Shop Finance");
  const workspaceIcon = activeRecord?.icon || (workspace === "home" ? "🏠" : "🏪");
  const accentColor = workspace === "home" ? "emerald" : "amber";
  const workspaceId = activeRecord?.id;

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        setWorkspace: (ws) => switchWorkspace(ws),
        switchWorkspace,
        workspaceName,
        workspaceIcon,
        accentColor,
        workspaceId,
        workspacesList,
        isLoadingWorkspaces,
        refetchWorkspaces: loadWorkspaces,
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
