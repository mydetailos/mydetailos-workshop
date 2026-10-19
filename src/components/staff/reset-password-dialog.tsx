"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { KeyRound, Eye, EyeOff, Sparkles, Loader2, Share2 } from "lucide-react";
import type { User } from "@/types";
import { useStaffStore, generateRandomStaffPassword } from "@/store/staff-store";
import { validateStrongPassword, PASSWORD_POLICY_HINT } from "@/lib/password-policy";
import { pushActivityLog } from "@/lib/activity-log-helper";
import type { StaffCredentialsInfo } from "./staff-credentials-modal";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: (credentials: StaffCredentialsInfo) => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [mustChange, setMustChange] = useState(true);
  const [busy, setBusy] = useState(false);
  const resetStaffPassword = useStaffStore((s) => s.resetStaffPassword);

  useEffect(() => {
    if (open && user) {
      setPassword(generateRandomStaffPassword());
      setShowPassword(true);
      setMustChange(true);
    }
  }, [open, user]);

  if (!user) return null;

  const handleGenerate = () => {
    const pwd = generateRandomStaffPassword();
    setPassword(pwd);
    setShowPassword(true);
  };

  const handleReset = async () => {
    const pwd = password.trim();
    if (!pwd) {
      toast.error("Please enter or generate a password.");
      return;
    }
    const err = validateStrongPassword(pwd);
    if (err) {
      toast.error(err);
      return;
    }

    setBusy(true);
    try {
      const res = await resetStaffPassword(user.id, pwd, mustChange);
      if (res.ok) {
        pushActivityLog({
          action: "UPDATED",
          entityType: "STAFF",
          entityId: user.email,
          entityLabel: user.name,
          details: `Staff password reset (mustChange: ${mustChange})`,
        });
        toast.success("Password reset successfully.");
        onOpenChange(false);
        onSuccess({
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          designation: user.designation,
          temporaryPassword: pwd,
          isNewUser: false,
        });
      } else {
        toast.error("Failed to reset password. Please try again.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error resetting password");
    } finally {
      setBusy(false);
    }
  };

  const handleShareExisting = () => {
    onOpenChange(false);
    onSuccess({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      designation: user.designation,
      temporaryPassword: undefined,
      isNewUser: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="size-4" />
            </div>
            <DialogTitle>Reset Login Password</DialogTitle>
          </div>
          <DialogDescription>
            Generate a new temporary password or share login information for{" "}
            <span className="font-semibold text-foreground">{user.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User info box */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Staff Member:</span>
              <span className="font-medium text-foreground">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Login Email:</span>
              <span className="font-mono font-medium text-foreground">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobile:</span>
                <span className="text-foreground">{user.phone}</span>
              </div>
            )}
          </div>

          {/* New password input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-password">New Temporary Password</Label>
              <button
                type="button"
                onClick={handleGenerate}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                <Sparkles className="size-3" /> Auto-generate
              </button>
            </div>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
          </div>

          {/* Must change password toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="must-change-toggle" className="text-xs font-medium cursor-pointer">
                Require password change on login
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Staff must pick a new password before accessing the portal.
              </p>
            </div>
            <Switch
              id="must-change-toggle"
              checked={mustChange}
              onCheckedChange={setMustChange}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={handleShareExisting}
          >
            <Share2 className="size-3.5" />
            Share Current Details
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleReset()}
            >
              {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Reset & Share
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
