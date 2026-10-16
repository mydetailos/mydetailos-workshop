"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserRole } from "@/types";
import { getDefaultModuleKeysForRole } from "@/lib/staff-role-defaults";
import { permissionsForStaffAccessLevel } from "@/lib/staff-access";

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  baseRole: UserRole;
  permissions: string[];
  accessLevel: "withEditAccess" | "withoutEditAccess";
  badgeColor?: string;
  createdAt: string;
}

interface CustomRoleState {
  customRoles: CustomRole[];
  addRole: (input: Omit<CustomRole, "id" | "createdAt">) => CustomRole;
  updateRole: (id: string, updates: Partial<Omit<CustomRole, "id" | "createdAt">>) => void;
  deleteRole: (id: string) => void;
  getRoleById: (id: string) => CustomRole | undefined;
  getRoleByName: (name: string) => CustomRole | undefined;
}

export const useCustomRoleStore = create<CustomRoleState>()(
  persist(
    (set, get) => ({
      customRoles: [
        {
          id: "role-service-advisor",
          name: "Service Advisor",
          description: "Handles customer reception, job-card creation, and customer follow-ups.",
          baseRole: "RECEPTIONIST",
          permissions: permissionsForStaffAccessLevel(
            getDefaultModuleKeysForRole("RECEPTIONIST") as string[],
            "withEditAccess",
            "RECEPTIONIST"
          ),
          accessLevel: "withEditAccess",
          badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
          createdAt: new Date().toISOString(),
        },
        {
          id: "role-detailer-lead",
          name: "Detailing Lead",
          description: "Leads workshop bays, oversees mechanic assignments, and inspects quality.",
          baseRole: "SUPERVISOR",
          permissions: permissionsForStaffAccessLevel(
            getDefaultModuleKeysForRole("SUPERVISOR") as string[],
            "withEditAccess",
            "SUPERVISOR"
          ),
          accessLevel: "withEditAccess",
          badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
          createdAt: new Date().toISOString(),
        },
        {
          id: "role-accountant",
          name: "Accountant / Cashier",
          description: "Manages billing, invoice receipts, vendor expenses, and cash/bank balances.",
          baseRole: "MANAGER",
          permissions: [
            "DASHBOARD_VIEW",
            "BILLING_CREATE",
            "BILLING_VIEW",
            "BILLING_EDIT",
            "EXPENSES_CREATE",
            "EXPENSES_VIEW",
            "EXPENSES_EDIT",
            "CASH_BANK_CREATE",
            "CASH_BANK_VIEW",
            "CASH_BANK_EDIT",
            "REPORTS_VIEW",
            "PARTIES_VIEW",
            "PAYROLL_VIEW",
          ],
          accessLevel: "withEditAccess",
          badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
          createdAt: new Date().toISOString(),
        },
      ],

      addRole: (input) => {
        const id = `role-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const newRole: CustomRole = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          customRoles: [...state.customRoles, newRole],
        }));
        return newRole;
      },

      updateRole: (id, updates) => {
        set((state) => ({
          customRoles: state.customRoles.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRole: (id) => {
        set((state) => ({
          customRoles: state.customRoles.filter((r) => r.id !== id),
        }));
      },

      getRoleById: (id) => {
        return get().customRoles.find((r) => r.id === id);
      },

      getRoleByName: (name) => {
        const target = name.trim().toLowerCase();
        return get().customRoles.find((r) => r.name.toLowerCase() === target);
      },
    }),
    {
      name: "mydetailos-custom-roles",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
