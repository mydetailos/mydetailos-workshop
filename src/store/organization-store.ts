"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OrganizationEntitlement } from "@/types";
import { apiGet } from "@/lib/api-client";
import {
  canCreateBranchFromEntitlement,
  canExportDataFromEntitlement,
  isAtOrOverBranchLimit,
} from "@/lib/plan-limits";

interface OrganizationStore {
  entitlement: OrganizationEntitlement | null;
  setEntitlement: (entitlement: OrganizationEntitlement | null) => void;
  refreshEntitlement: () => Promise<OrganizationEntitlement | null>;
  canAddBranch: () => boolean;
  isAtBranchLimit: () => boolean;
  canExport: () => boolean;
}

export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    (set, get) => ({
      entitlement: null,

      setEntitlement: (entitlement) => set({ entitlement }),

      refreshEntitlement: async () => {
        try {
          const data = await apiGet<OrganizationEntitlement>("/api/organization/subscription");
          set({ entitlement: data });
          return data;
        } catch {
          set({ entitlement: null });
          return null;
        }
      },

      canAddBranch: () => canCreateBranchFromEntitlement(get().entitlement),

      isAtBranchLimit: () => isAtOrOverBranchLimit(get().entitlement),

      canExport: () => canExportDataFromEntitlement(get().entitlement),
    }),
    {
      name: "mdos-organization-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ entitlement: state.entitlement }),
    }
  )
);
