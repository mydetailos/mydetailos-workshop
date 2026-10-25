"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api-client";
import type { SubscriptionBillRow } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPaymentStatus } from "@/lib/subscription-export-lock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { openSubscriptionTaxInvoicePrint } from "@/lib/subscription-tax-invoice";
import { useOrganizationStore } from "@/store/organization-store";

function paymentStatusVariant(status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  switch (status) {
    case "PAID": return "default";
    case "PENDING": return "secondary";
    case "PROCESSING": return "secondary";
    case "FAILED": return "destructive";
    default: return "outline";
  }
}

function openSubscriptionBillPrint(bill: SubscriptionBillRow & { organizationName?: string }) {
  openSubscriptionTaxInvoicePrint(bill);
}

export function SubscriptionBillsSection({ refreshKey = 0 }: { refreshKey?: number }) {
  const [bills, setBills] = useState<SubscriptionBillRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiGet<{ bills: SubscriptionBillRow[] }>(
          "/api/organization/subscription/bills"
        );
        if (!cancelled) setBills(data.bills ?? []);
      } catch {
        if (!cancelled) setBills([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading subscription bills…</p>;
  }

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No subscription bills yet. Bills are generated after a payment is verified.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5">Bill #</th>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Plan</th>
            <th className="px-3 py-2.5">Term</th>
            <th className="px-3 py-2.5">Expires</th>
            <th className="px-3 py-2.5 text-right">Amount</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2.5 font-mono text-xs font-medium">{b.billNumber}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{formatDate(b.createdAt)}</td>
              <td className="px-3 py-2.5">{b.planName}</td>
              <td className="px-3 py-2.5">{b.termLabel}</td>
              <td className="px-3 py-2.5">{formatDate(b.periodEnd)}</td>
              <td className="px-3 py-2.5 text-right font-medium">
                {b.totalAmount != null
                  ? formatCurrency(b.totalAmount)
                  : b.amount != null
                    ? formatCurrency(b.amount)
                    : "—"}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={paymentStatusVariant(b.paymentStatus)} className="text-xs">
                  {formatPaymentStatus(b.paymentStatus)}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  title="Download Tax Invoice"
                  onClick={() => {
                    void (async () => {
                      try {
                        const full = await apiGet<SubscriptionBillRow>(
                          `/api/organization/subscription/bills/${encodeURIComponent(b.id)}`
                        );
                        const orgName =
                          full.organizationName ||
                          useOrganizationStore.getState().entitlement?.organization.name;
                        openSubscriptionTaxInvoicePrint({
                          ...full,
                          organizationName: orgName,
                        });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not open invoice");
                      }
                    })();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

