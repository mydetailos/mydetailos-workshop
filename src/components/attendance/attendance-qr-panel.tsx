"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import QRCode from "react-qr-code";
import { useBranchStore } from "@/store/branch-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode, KeyRound, Copy, Check, ExternalLink, Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAttendanceStore } from "@/store/attendance-store";
import type { UserRole } from "@/types";

function buildPunchUrl(origin: string, branchId: string, qr?: string): string {
  const u = new URL("/attendance/punch", origin);
  u.searchParams.set("branchId", branchId);
  if (qr) u.searchParams.set("qr", qr);
  return u.toString();
}

/** Accepts `http://192.168.1.5:3000` or `192.168.1.5:3000` */
function normalizeOrigin(input: string): string {
  const s = input.trim();
  if (!s) return "";
  try {
    const u = new URL(s.includes("://") ? s : `http://${s}`);
    return u.origin;
  } catch {
    return "";
  }
}

function useWindowOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );
}

function isLocalhostOrigin(origin: string): boolean {
  if (!origin) return false;
  try {
    const h = new URL(origin).hostname;
    return h === "localhost" || h === "127.0.0.1";
  } catch {
    return false;
  }
}

type AttendanceQrPanelProps = {
  defaultBranchId: string;
};

type ResolvedStaff = {
  id: string;
  name: string;
  role: UserRole;
  branchId: string;
};

export function AttendanceQrPanel({ defaultBranchId }: AttendanceQrPanelProps) {
  const branches = useBranchStore((s) => s.branches);
  const punch = useAttendanceStore((s) => s.punch);
  const syncAttendance = useAttendanceStore((s) => s.sync);
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [copiedLink, setCopiedLink] = useState(false);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchPin, setPunchPin] = useState("");
  const [punchSubmitting, setPunchSubmitting] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);

  const branchSelectOptions = useMemo(() => {
    const active = branches.filter((b) => b.isActive);
    const sel = branches.find((b) => b.id === branchId);
    if (sel && !sel.isActive && !active.some((b) => b.id === sel.id)) {
      return [sel, ...active];
    }
    return active;
  }, [branches, branchId]);
  const windowOrigin = useWindowOrigin();
  const isLocalhost = isLocalhostOrigin(windowOrigin);

  const envOrigin =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
      : "";

  /** Set in .env.local while testing on phone: http://192.168.x.x:3000 */
  const devLanOrigin =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEV_LAN_ORIGIN
      ? normalizeOrigin(process.env.NEXT_PUBLIC_DEV_LAN_ORIGIN)
      : "";

  const effectiveOrigin = useMemo(() => {
    if (envOrigin) return envOrigin;
    if (devLanOrigin && (windowOrigin === "" || isLocalhost)) {
      return devLanOrigin;
    }
    return windowOrigin;
  }, [envOrigin, devLanOrigin, windowOrigin, isLocalhost]);

  const branch = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId]
  );

  const punchUrl = useMemo(() => {
    if (!effectiveOrigin || !branch) return "";
    return buildPunchUrl(effectiveOrigin, branch.id, branch.qrCodeId);
  }, [effectiveOrigin, branch]);

  const handleCopyLink = async () => {
    if (!punchUrl) return;
    try {
      await navigator.clipboard.writeText(punchUrl);
      setCopiedLink(true);
      toast.success("Punch link copied to clipboard.");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy punch link.");
    }
  };

  const handleQuickPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchPin.trim() || !branch) return;
    setPunchSubmitting(true);
    setPunchError(null);
    try {
      const res = await fetch("/api/attendance/resolve-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: punchPin.trim(), branchId: branch.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        staff?: ResolvedStaff;
      };

      if (!data.ok || !data.staff) {
        setPunchError(data.message ?? "PIN not recognized.");
        return;
      }

      const staff = data.staff;
      const result = await punch({
        staff: {
          id: staff.id,
          name: staff.name,
          email: "",
          phone: "",
          role: staff.role,
          branchId: staff.branchId,
          isActive: true,
        },
        branchId: branch.id,
      });

      if (!result.ok) {
        if (result.error === "WRONG_BRANCH") {
          setPunchError("This staff member is not assigned to this branch.");
        } else if (result.error === "INACTIVE") {
          setPunchError("This staff account is inactive.");
        } else {
          setPunchError("Punch failed. Please try again.");
        }
        return;
      }

      const actionText = result.kind === "checkIn" ? "Checked in" : "Checked out";
      toast.success(`${actionText} at ${result.time} for ${staff.name}!`);
      setPunchModalOpen(false);
      setPunchPin("");
      await syncAttendance();
    } catch {
      setPunchError("Could not connect to the punch service.");
    } finally {
      setPunchSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Store QR (PIN punch)
          </CardTitle>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {branchSelectOptions.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full max-w-[220px] mx-auto aspect-square rounded-lg border border-border bg-white p-3">
            {punchUrl ? (
              <QRCode
                value={punchUrl}
                size={180}
                level="M"
                className="h-auto w-full max-h-[180px]"
              />
            ) : (
              <div className="text-xs text-muted-foreground text-center p-4">
                Generating QR…
              </div>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Staff scan this code once at the branch, enter their PIN, and punch in or out
            automatically.
          </p>

          <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => {
                setPunchPin("");
                setPunchError(null);
                setPunchModalOpen(true);
              }}
            >
              <KeyRound className="w-4 h-4" />
              Quick PIN Punch (Counter)
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1"
                onClick={handleCopyLink}
                disabled={!punchUrl}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Copied" : "Copy Link"}
              </Button>
              {punchUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs gap-1"
                  asChild
                >
                  <a href={punchUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Page
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={punchModalOpen} onOpenChange={setPunchModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="w-5 h-5 text-primary" />
              Quick PIN Punch
            </DialogTitle>
            <DialogDescription>
              {branch?.name ? `Branch: ${branch.name}. ` : ""}
              Enter staff 4-digit PIN to punch in or out.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickPunch} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="quick-pin">Staff 4-Digit PIN</Label>
              <Input
                id="quick-pin"
                name="quick-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="••••"
                className="text-center text-xl tracking-[0.3em] font-mono h-12"
                value={punchPin}
                onChange={(e) => setPunchPin(e.target.value.replace(/\D/g, ""))}
                disabled={punchSubmitting}
                autoFocus
              />
            </div>

            {punchError && (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                {punchError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={punchPin.trim().length === 0 || punchSubmitting}
            >
              {punchSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Recording punch…
                </>
              ) : (
                "Punch In / Out"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
