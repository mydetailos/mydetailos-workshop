"use client";

import { create } from "zustand";
import type { Customer, JobCard, Invoice, Vehicle, CustomerMembership, WalletTransaction } from "@/types";
import type { ServiceItem } from "@/types/job-card";
import { buildApiUrl } from "@/lib/api-base";
import {
  DEFAULT_CUSTOMER_REWARD_CONFIG,
  type CustomerRewardConfig,
} from "@/lib/customer-reward-config";
import { useCustomerAuthStore } from "@/store/customer-auth-store";

// Helper function to calculate total paid from payments array
function getTotalPaid(invoice: Invoice): number {
  return (invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
}

export type { CustomerRewardConfig };
export type RewardConfig = CustomerRewardConfig;

const DEFAULT_REWARD_CONFIG = DEFAULT_CUSTOMER_REWARD_CONFIG;

interface CustomerDashboardData {
  customer: Customer | null;
  jobCards: JobCard[];
  invoices: Invoice[];
  vehicles: Vehicle[];
  memberships: CustomerMembership[];
  walletTransactions: WalletTransaction[];
  serviceHistory: Array<{
    id: string;
    jobCardNumber: string;
    date: string;
    vehicle: string;
    services: string[];
    amount: number;
    status: string;
  }>;
  rewardConfig: RewardConfig;
  isLoading: boolean;
  error: string | null;
}

interface CustomerDashboardStore extends CustomerDashboardData {
  /** Fetch all customer dashboard data */
  bootstrap: () => Promise<void>;

  /** Refetch data */
  refresh: () => Promise<void>;

  /** Get current job card (most recent active) */
  getCurrentJobCard: () => JobCard | null;

  /** Get recent invoice (most recent) */
  getRecentInvoice: () => Invoice | null;

  /** Get customer's total outstanding amount */
  getTotalOutstanding: () => number;

  /** Get customer's primary vehicle */
  getPrimaryVehicle: () => Vehicle | null;

  /** Get active memberships */
  getActiveMemberships: () => CustomerMembership[];

  /** Clear all data */
  clear: () => void;
}

export const useCustomerDashboardStore = create<CustomerDashboardStore>((set, get) => ({
  customer: null,
  jobCards: [],
  invoices: [],
  vehicles: [],
  memberships: [],
  walletTransactions: [],
  serviceHistory: [],
  rewardConfig: DEFAULT_REWARD_CONFIG,
  isLoading: false,
  error: null,

  bootstrap: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use the customer JWT token, NOT the staff apiGet (which uses the staff token)
      const token = useCustomerAuthStore.getState().accessToken;
      const res = await fetch(buildApiUrl("/api/customer/bootstrap"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const body = await res.json() as {
        data?: {
          customer: Customer;
          jobCards: JobCard[];
          invoices: Invoice[];
          vehicles: Vehicle[];
          memberships: CustomerMembership[];
          walletTransactions: WalletTransaction[];
          serviceHistory: Array<{
            id: string;
            jobCardNumber: string;
            date: string;
            vehicle: string;
            services: string[];
            amount: number;
            status: string;
          }>;
          rewardConfig?: RewardConfig;
        } | null;
        error?: { message?: string } | null;
      };

      if (!res.ok || body.error || !body.data) {
        const errorMessage = body.error?.message ?? "Failed to load customer data";
        set({ error: errorMessage, isLoading: false });
        return;
      }

      const data = body.data;

      // 1. Check memberships from data.memberships, data.subscriptions, or data.customerMemberships
      let membershipsList: CustomerMembership[] = (
        Array.isArray(data.memberships) ? data.memberships :
        Array.isArray((data as any).subscriptions) ? (data as any).subscriptions :
        Array.isArray((data as any).customerMemberships) ? (data as any).customerMemberships :
        []
      );

      // 2. If empty, attempt to fetch from GET /api/customer/memberships
      if (membershipsList.length === 0 && token) {
        try {
          const memRes = await fetch(buildApiUrl("/api/customer/memberships"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (memRes.ok) {
            const memBody = (await memRes.json()) as {
              data?: { memberships?: CustomerMembership[]; subscriptions?: CustomerMembership[] } | CustomerMembership[];
            };
            const fetched =
              (memBody?.data && Array.isArray(memBody.data) ? memBody.data : undefined) ||
              (memBody?.data && "memberships" in memBody.data && Array.isArray(memBody.data.memberships) ? memBody.data.memberships : undefined) ||
              (memBody?.data && "subscriptions" in memBody.data && Array.isArray(memBody.data.subscriptions) ? memBody.data.subscriptions : undefined);
            if (Array.isArray(fetched) && fetched.length > 0) {
              membershipsList = fetched;
            }
          }
        } catch {
          // ignore endpoint error
        }
      }

      // 3. If still empty, derive memberships from customer's membership invoices and job cards
      if (membershipsList.length === 0) {
        const derived: CustomerMembership[] = [];
        const seenIds = new Set<string>();

        // From invoices
        for (const inv of (data.invoices || [])) {
          const isMembershipInvoice =
            inv.source === "MEMBERSHIP" ||
            Boolean(inv.membershipId) ||
            Boolean(inv.membershipPackageName);

          if (isMembershipInvoice) {
            const memId = inv.membershipId || `mem-${inv.id}`;
            if (!seenIds.has(memId)) {
              seenIds.add(memId);
              const start = inv.membershipStartDate || inv.createdAt;
              const end =
                inv.membershipEndDate ||
                new Date(new Date(start).setFullYear(new Date(start).getFullYear() + 1)).toISOString();
              const isExpired = end ? new Date(end).getTime() < Date.now() : false;
              const matchedVeh = (data.vehicles || []).find(
                (v) =>
                  (inv.vehicleRegNumber && inv.vehicleRegNumber !== "—" && v.registrationNumber === inv.vehicleRegNumber) ||
                  (inv.vehicleMakeModel && `${v.make} ${v.model}`.toLowerCase() === inv.vehicleMakeModel.toLowerCase())
              );

              derived.push({
                id: memId,
                customerId: inv.customerId,
                packageId: inv.membershipPackageName || "MEMBERSHIP",
                packageName: inv.membershipPackageName || inv.lineItems?.[0]?.description || "Service Plan",
                startDate: start,
                endDate: end,
                status: isExpired ? "EXPIRED" : "ACTIVE",
                invoiceId: inv.id,
                vehicleId: matchedVeh?.id,
                usageHistory: [],
              });
            }
          }
        }

        // From job cards with membership activation
        for (const job of (data.jobCards || [])) {
          if (job.membershipActivationId || job.membershipActivationPackageName) {
            const memId = job.membershipActivationId || `mem-job-${job.id}`;
            if (!seenIds.has(memId)) {
              seenIds.add(memId);
              const start = job.membershipActivationStartDate || job.createdAt;
              const end =
                job.membershipActivationEndDate ||
                new Date(new Date(start).setFullYear(new Date(start).getFullYear() + 1)).toISOString();
              const isExpired = end ? new Date(end).getTime() < Date.now() : false;

              derived.push({
                id: memId,
                customerId: job.customerId,
                packageId: job.membershipActivationPackageId || "MEMBERSHIP",
                packageName: job.membershipActivationPackageName || "Service Plan",
                startDate: start,
                endDate: end,
                status: isExpired ? "EXPIRED" : "ACTIVE",
                vehicleId: job.vehicleId,
                usageHistory: [],
              });
            }
          }
        }

        if (derived.length > 0) {
          membershipsList = derived;
        }
      }

      // 4. Enrich memberships with missing packageName, invoiceId, or vehicleId from invoices/job cards
      membershipsList = membershipsList.map((mem) => {
        let packageName = mem.packageName;
        let invoiceId = mem.invoiceId;
        let vehicleId = mem.vehicleId;

        const matchedInv = (data.invoices || []).find(
          (inv) => inv.id === mem.invoiceId || inv.membershipId === mem.id
        );
        if (matchedInv) {
          if (!invoiceId) invoiceId = matchedInv.id;
          if (!packageName && matchedInv.membershipPackageName) {
            packageName = matchedInv.membershipPackageName;
          }
        }

        const matchedJob = (data.jobCards || []).find(
          (job) => job.membershipActivationId === mem.id
        );
        if (matchedJob) {
          if (!packageName && matchedJob.membershipActivationPackageName) {
            packageName = matchedJob.membershipActivationPackageName;
          }
          if (!vehicleId && matchedJob.vehicleId) {
            vehicleId = matchedJob.vehicleId;
          }
        }

        return {
          ...mem,
          packageName: packageName || "Service Plan",
          invoiceId,
          vehicleId,
        };
      });

      set({
        customer: data.customer,
        jobCards: data.jobCards || [],
        invoices: data.invoices || [],
        vehicles: data.vehicles || [],
        memberships: membershipsList,
        walletTransactions: data.walletTransactions || [],
        serviceHistory: data.serviceHistory || [],
        rewardConfig: data.rewardConfig ?? DEFAULT_REWARD_CONFIG,
        isLoading: false,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load customer data";
      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    await get().bootstrap();
  },

  getCurrentJobCard: () => {
    const jobs = get().jobCards;
    if (jobs.length === 0) return null;

    const statusPriority: Record<string, number> = {
      RECEIVED: 0,
      INSPECTION: 1,
      AWAITING_SERVICE: 2,
      QUALITY_CHECK: 3,
      READY: 4,
      INVOICED: 5,
      DELIVERED: 6,
      CANCELLED: 7,
    };

    const active = jobs.filter((j) => !["DELIVERED", "CANCELLED"].includes(j.status));
    const pool = active.length > 0 ? active : jobs;

    const toMs = (iso?: string) => {
      if (!iso) return 0;
      const ms = new Date(iso).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };

    return [...pool].sort((a, b) => {
      const timeDiff = toMs(b.updatedAt) - toMs(a.updatedAt);
      if (timeDiff !== 0) return timeDiff;

      const createdDiff = toMs(b.createdAt) - toMs(a.createdAt);
      if (createdDiff !== 0) return createdDiff;

      return (statusPriority[a.status] ?? 999) - (statusPriority[b.status] ?? 999);
    })[0] ?? null;
  },

  getRecentInvoice: () => {
    const invoices = get().invoices;
    if (invoices.length === 0) return null;

    return [...invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  },

  getTotalOutstanding: () => {
    const invoices = get().invoices;
    return invoices.reduce((sum, inv) => {
      const outstanding = (inv.grandTotal ?? 0) - getTotalPaid(inv);
      return sum + Math.max(0, outstanding);
    }, 0);
  },

  getPrimaryVehicle: () => {
    const vehicles = get().vehicles;
    if (vehicles.length === 0) return null;

    // Return most recently used vehicle (from service history)
    return vehicles[0];
  },

  getActiveMemberships: () => {
    const memberships = get().memberships;
    const now = new Date().toISOString();

    return memberships.filter((m) => {
      if (m.status && m.status !== "ACTIVE") return false;
      const endDate = m.endDate;
      return !endDate || new Date(endDate).getTime() >= new Date(now).getTime();
    });
  },

  clear: () => {
    set({
      customer: null,
      jobCards: [],
      invoices: [],
      vehicles: [],
      memberships: [],
      walletTransactions: [],
      serviceHistory: [],
      rewardConfig: DEFAULT_REWARD_CONFIG,
      error: null,
    });
  },

}));

