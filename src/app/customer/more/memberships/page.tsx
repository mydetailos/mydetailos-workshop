"use client";

import { useEffect } from "react";
import { useCustomerDashboardStore } from "@/store/customer-dashboard-store";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function MembershipsPage() {
  const { getActiveMemberships, memberships, vehicles, invoices, isLoading, refresh } =
    useCustomerDashboardStore();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = getActiveMemberships();
  const expired = memberships.filter((m) => !active.find((a) => a.id === m.id));

  if (isLoading && memberships.length === 0) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-2xl">
        <div className="h-6 w-32 bg-muted/60 rounded animate-pulse" />
        <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />
        <div className="h-32 bg-muted/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      {memberships.length === 0 ? (
        <Card>
          <CardContent className="pt-12 text-center pb-12">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No memberships yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ask the workshop about available service plans
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Active
              </p>
              {active.map((mem) => {
                const vehicle = vehicles.find(
                  (v) =>
                    v.id === mem.vehicleId ||
                    (v.registrationNumber && (mem as any).vehicleRegNumber === v.registrationNumber)
                );
                const invoice = invoices.find(
                  (inv) => inv.id === mem.invoiceId || (inv.membershipId && inv.membershipId === mem.id)
                );
                const vehicleLabel = vehicle
                  ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
                  : invoice?.vehicleMakeModel
                    ? `${invoice.vehicleMakeModel}${invoice.vehicleRegNumber && invoice.vehicleRegNumber !== "—" ? ` (${invoice.vehicleRegNumber})` : ""}`
                    : null;
                const price = invoice?.grandTotal ?? (mem as any).price;
                const usedCount = mem.usageHistory?.length || 0;
                const packageName =
                  mem.packageName || invoice?.membershipPackageName || "Service Plan";

                return (
                  <Card key={mem.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{packageName}</p>
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                              Membership ID: {mem.id}
                            </span>
                          </div>
                          {vehicleLabel && (
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              Vehicle: {vehicleLabel}
                            </p>
                          )}

                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 mt-2">
                            {price !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Price: </span>
                                ₹{price.toLocaleString("en-IN")}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Services Used: </span>
                              {usedCount}
                            </p>
                          </div>

                          <div className="flex gap-4 mt-1">
                            {mem.startDate && (
                              <p className="text-xs text-muted-foreground">
                                Started: {formatDate(mem.startDate)}
                              </p>
                            )}
                            {mem.endDate && (
                              <p className="text-xs text-muted-foreground">
                                Expires: {formatDate(mem.endDate)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-green-600 shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-semibold">Active</span>
                        </div>
                      </div>

                      {mem.usageHistory && mem.usageHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Service Usage History
                          </p>
                          <div className="space-y-1.5">
                            {[...mem.usageHistory]
                              .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                              .map((u, uIdx) => {
                                const usageMemId = u.membershipId || mem.id;
                                return (
                                  <div
                                    key={uIdx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs bg-muted/40 rounded-lg p-2.5 border border-border/50"
                                  >
                                    <div className="space-y-0.5">
                                      <p className="font-medium text-foreground">
                                        {u.serviceName || "Service"}
                                        {(u.quantity ?? 1) > 1 ? ` ×${u.quantity}` : ""}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground font-mono">
                                        Used from Membership ID:{" "}
                                        <span className="font-semibold text-primary">{usageMemId}</span>
                                        {u.jobCardId ? (
                                          <span className="font-sans ml-1.5 text-muted-foreground">
                                            · Job: {u.jobCardId}
                                          </span>
                                        ) : null}
                                      </p>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                      {new Date(u.usedAt).toLocaleString(undefined, {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {expired.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Past
              </p>
              {expired.map((mem) => {
                const vehicle = vehicles.find(
                  (v) =>
                    v.id === mem.vehicleId ||
                    (v.registrationNumber && (mem as any).vehicleRegNumber === v.registrationNumber)
                );
                const invoice = invoices.find(
                  (inv) => inv.id === mem.invoiceId || (inv.membershipId && inv.membershipId === mem.id)
                );
                const vehicleLabel = vehicle
                  ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
                  : invoice?.vehicleMakeModel
                    ? `${invoice.vehicleMakeModel}${invoice.vehicleRegNumber && invoice.vehicleRegNumber !== "—" ? ` (${invoice.vehicleRegNumber})` : ""}`
                    : null;
                const price = invoice?.grandTotal ?? (mem as any).price;
                const usedCount = mem.usageHistory?.length || 0;
                const packageName =
                  mem.packageName || invoice?.membershipPackageName || "Service Plan";

                return (
                  <Card key={mem.id} className="opacity-75">
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{packageName}</p>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                            Membership ID: {mem.id}
                          </span>
                        </div>
                        {vehicleLabel && (
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">
                            Vehicle: {vehicleLabel}
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 mt-2">
                          {price !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Price: </span>
                              ₹{price.toLocaleString("en-IN")}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Services Used: </span>
                            {usedCount}
                          </p>
                        </div>

                        {mem.endDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expired: {formatDate(mem.endDate)}
                          </p>
                        )}
                      </div>

                      {mem.usageHistory && mem.usageHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Service Usage History
                          </p>
                          <div className="space-y-1.5">
                            {[...mem.usageHistory]
                              .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                              .map((u, uIdx) => {
                                const usageMemId = u.membershipId || mem.id;
                                return (
                                  <div
                                    key={uIdx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs bg-muted/40 rounded-lg p-2.5 border border-border/50"
                                  >
                                    <div className="space-y-0.5">
                                      <p className="font-medium text-foreground">
                                        {u.serviceName || "Service"}
                                        {(u.quantity ?? 1) > 1 ? ` ×${u.quantity}` : ""}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground font-mono">
                                        Used from Membership ID:{" "}
                                        <span className="font-semibold text-primary">{usageMemId}</span>
                                        {u.jobCardId ? (
                                          <span className="font-sans ml-1.5 text-muted-foreground">
                                            · Job: {u.jobCardId}
                                          </span>
                                        ) : null}
                                      </p>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                      {new Date(u.usedAt).toLocaleString(undefined, {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
