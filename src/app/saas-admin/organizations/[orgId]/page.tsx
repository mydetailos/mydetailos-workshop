"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  OrganizationEntitlement,
  PlanCode,
  SubscriptionBillRow,
  SubscriptionPaymentRow,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from "@/types";
import { branchLimitLabel } from "@/lib/plan-limits";
import { formatPaymentStatus } from "@/lib/subscription-export-lock";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import {
  openSubscriptionTaxInvoicePrint,
  openSubscriptionInvoiceWhatsApp,
} from "@/lib/subscription-tax-invoice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLAN_OPTIONS: PlanCode[] = ["STARTER", "GROWTH", "BUSINESS", "ENTERPRISE", "CUSTOM"];
const TERM_OPTIONS = [12, 24, 36] as const;
const PAY_STATUS: SubscriptionPaymentStatus[] = ["PAID", "PENDING", "PROCESSING", "FAILED"];
const SUB_STATUS: SubscriptionStatus[] = ["ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"];

type PlatformOrgDetail = OrganizationEntitlement & {
  payments?: SubscriptionPaymentRow[];
  bills?: SubscriptionBillRow[];
};

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function SaasAdminOrganizationDetailPage() {
  const params = useParams();
  const orgId = typeof params.orgId === "string" ? params.orgId : "";
  const [row, setRow] = useState<PlatformOrgDetail | null>(null);
  const [overrideInput, setOverrideInput] = useState("");
  const [userOverrideInput, setUserOverrideInput] = useState("");
  const [planCode, setPlanCode] = useState<PlanCode>("STARTER");
  const [termMonths, setTermMonths] = useState<number>(12);
  const [expiresAt, setExpiresAt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<SubscriptionPaymentStatus>("PAID");
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>("ACTIVE");
  const [txnId, setTxnId] = useState("");
  const [verifyTxn, setVerifyTxn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyRow = (data: PlatformOrgDetail) => {
    setRow(data);
    setPlanCode(data.subscription.planCode);
    setTermMonths(data.subscription.termMonths ?? 12);
    setExpiresAt(toDateInput(data.subscription.expiresAt ?? data.subscription.currentPeriodEnd));
    setStartsAt(toDateInput(data.subscription.startsAt));
    setPaymentStatus(data.subscription.paymentStatus ?? "PAID");
    setSubStatus(data.subscription.status);
    setTxnId(data.subscription.lastPaymentTxnId ?? "");
    setOverrideInput(
      data.subscription.maxBranchesOverride === null
        ? ""
        : String(data.subscription.maxBranchesOverride)
    );
    setUserOverrideInput(
      data.subscription.maxUsersOverride === null
        ? ""
        : String(data.subscription.maxUsersOverride)
    );
  };

  const load = async () => {
    const data = await apiGet<PlatformOrgDetail>(
      `/api/platform/organizations/${encodeURIComponent(orgId)}`
    );
    applyRow(data);
  };

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const trimmed = overrideInput.trim();
      const maxBranchesOverride =
        trimmed === "" ? null : Number.parseInt(trimmed, 10);
      if (trimmed !== "" && (!Number.isFinite(maxBranchesOverride) || maxBranchesOverride! < 0)) {
        toast.error("Override must be a non-negative integer or empty");
        return;
      }
      const userTrimmed = userOverrideInput.trim();
      const maxUsersOverride =
        userTrimmed === "" ? null : Number.parseInt(userTrimmed, 10);
      if (userTrimmed !== "" && (!Number.isFinite(maxUsersOverride) || maxUsersOverride! < 0)) {
        toast.error("User override must be a non-negative integer or empty");
        return;
      }
      const data = await apiPatch<OrganizationEntitlement>(
        `/api/platform/organizations/${encodeURIComponent(orgId)}/subscription`,
        {
          planCode,
          maxBranchesOverride,
          maxUsersOverride,
          termMonths,
          status: subStatus,
          paymentStatus,
          lastPaymentTxnId: txnId.trim() || null,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }
      );
      applyRow({ ...row!, ...data, payments: row?.payments, bills: row?.bills });
      toast.success("Subscription updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await apiPost(
        `/api/platform/organizations/${encodeURIComponent(orgId)}/subscription/mark-paid`,
        {
          txnReference: verifyTxn.trim() || undefined,
          termMonths,
        }
      );
      toast.success("Marked paid — expiry extended and bill created");
      setVerifyTxn("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mark paid failed");
    } finally {
      setSaving(false);
    }
  };

  const verifyPayment = async (paymentId: string, outcome: "PAID" | "FAILED") => {
    if (!orgId) return;
    setSaving(true);
    try {
      await apiPost(
        `/api/platform/organizations/${encodeURIComponent(orgId)}/subscription/verify-payment`,
        {
          paymentId,
          outcome,
          txnReference: verifyTxn.trim() || undefined,
        }
      );
      toast.success(outcome === "PAID" ? "Payment verified" : "Payment marked failed");
      setVerifyTxn("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!row) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/saas-admin/organizations"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Organizations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{row.organization.name}</h1>
        <p className="font-mono text-xs text-muted-foreground">{row.organization.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Branches: {row.usage.branchesUsed} /{" "}
            {branchLimitLabel(row.subscription.effectiveMaxBranches)} · Users:{" "}
            {row.usage.usersUsed ?? "—"} · Export:{" "}
            {row.subscription.exportLocked ? "LOCKED" : "OK"} · Days left:{" "}
            {row.subscription.daysRemaining ?? "—"} · Payment:{" "}
            {formatPaymentStatus(row.subscription.paymentStatus)}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="planCode">Plan</Label>
              <Select value={planCode} onValueChange={(v) => setPlanCode(v as PlanCode)}>
                <SelectTrigger id="planCode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="termMonths">Term</Label>
              <Select
                value={String(termMonths)}
                onValueChange={(v) => setTermMonths(Number(v))}
              >
                <SelectTrigger id="termMonths">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERM_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m / 12} year{m > 12 ? "s" : ""} ({m} months)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts</Label>
              <Input
                id="startsAt"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subStatus">Subscription status</Label>
              <Select value={subStatus} onValueChange={(v) => setSubStatus(v as SubscriptionStatus)}>
                <SelectTrigger id="subStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUB_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payStatus">Payment status</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) => setPaymentStatus(v as SubscriptionPaymentStatus)}
              >
                <SelectTrigger id="payStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAY_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatPaymentStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="txnId">Last payment / txn ID</Label>
              <Input id="txnId" value={txnId} onChange={(e) => setTxnId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxOverride">maxBranchesOverride</Label>
              <Input
                id="maxOverride"
                inputMode="numeric"
                placeholder="Empty = use plan default"
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUsersOverride">maxUsersOverride</Label>
              <Input
                id="maxUsersOverride"
                inputMode="numeric"
                placeholder="Empty = use plan default"
                value={userOverrideInput}
                onChange={(e) => setUserOverrideInput(e.target.value)}
              />
            </div>
          </div>

          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save subscription"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verify / mark paid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="verifyTxn">Txn reference (optional)</Label>
            <Input
              id="verifyTxn"
              value={verifyTxn}
              onChange={(e) => setVerifyTxn(e.target.value)}
              placeholder="UPI / bank reference"
            />
          </div>
          <Button type="button" onClick={() => void markPaid()} disabled={saving}>
            Mark paid &amp; extend term
          </Button>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Txn</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(row.payments ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                      No renewal payments yet.
                    </td>
                  </tr>
                ) : (
                  (row.payments ?? []).map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{formatDate(p.createdAt)}</td>
                      <td className="px-3 py-2">{formatPaymentStatus(p.status)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.txnReference ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.notes ?? "—"}</td>
                      <td className="px-3 py-2">
                        {p.status === "PENDING" || p.status === "PROCESSING" ? (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving}
                              onClick={() => void verifyPayment(p.id, "PAID")}
                            >
                              Verify paid
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => void verifyPayment(p.id, "FAILED")}
                            >
                              Fail
                            </Button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Bill #</th>
                  <th className="px-3 py-2">Term</th>
                  <th className="px-3 py-2">Period end</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {(row.bills ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                      No bills yet.
                    </td>
                  </tr>
                ) : (
                  (row.bills ?? []).map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{b.billNumber}</td>
                      <td className="px-3 py-2">{b.termLabel}</td>
                      <td className="px-3 py-2">{formatDate(b.periodEnd)}</td>
                      <td className="px-3 py-2">{formatDate(b.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                                  openSubscriptionTaxInvoicePrint({
                                    ...full,
                                    organizationName: row.organization.name,
                                  });
                                } catch {
                                  openSubscriptionTaxInvoicePrint({
                                    ...b,
                                    organizationName: row.organization.name,
                                  });
                                }
                              })();
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[#25D366] hover:text-[#20ba5a] hover:bg-[#25D366]/10"
                            title="Share invoice on WhatsApp"
                            onClick={() => {
                              void (async () => {
                                try {
                                  const full = await apiGet<SubscriptionBillRow>(
                                    `/api/organization/subscription/bills/${encodeURIComponent(b.id)}`
                                  );
                                  openSubscriptionInvoiceWhatsApp({
                                    ...full,
                                    organizationName: row.organization.name,
                                  });
                                } catch {
                                  openSubscriptionInvoiceWhatsApp({
                                    ...b,
                                    organizationName: row.organization.name,
                                  });
                                }
                              })();
                            }}
                          >
                            <svg className="size-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.791.82 3.181 0 5.768-2.587 5.768-5.766.001-3.182-2.585-5.77-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.227-.563-1.854-.771-3.04-2.655-3.133-2.779-.093-.124-.752-1.002-.752-1.91 0-.909.475-1.356.645-1.54.17-.185.372-.232.497-.232.124 0 .248.001.355.006.113.006.264-.043.413.315.155.372.531 1.298.577 1.393.047.095.078.207.016.331-.062.125-.093.203-.186.311-.093.109-.196.244-.28.327-.093.093-.19.195-.082.381.108.185.481.794 1.033 1.285.711.633 1.31.83 1.497.923.186.093.295.078.404-.047.108-.124.465-.541.589-.728.124-.186.248-.155.418-.093.17.062 1.082.51 1.268.604.186.093.31.14.356.217.047.078.047.45-.097.855z" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
