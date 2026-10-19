"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { marketingLoginUrl } from "@/lib/marketing-site";

export interface StaffCredentialsInfo {
  name: string;
  email: string;
  phone?: string;
  role: string;
  designation?: string;
  temporaryPassword?: string;
  isNewUser?: boolean;
}

interface StaffCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: StaffCredentialsInfo | null;
}

export function StaffCredentialsModal({
  open,
  onOpenChange,
  credentials,
}: StaffCredentialsModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!credentials) return null;

  const loginUrl = marketingLoginUrl();

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getFullMessage = () => {
    const lines = [
      `Hello ${credentials.name},`,
      "",
      "Here are your login credentials for My Detail OS:",
      `• Login URL: ${loginUrl}`,
      `• Login Email: ${credentials.email}`,
    ];

    if (credentials.temporaryPassword) {
      lines.push(`• Temporary Password: ${credentials.temporaryPassword}`);
      lines.push("");
      lines.push("Please sign in and set your new password upon first login.");
    } else {
      lines.push("");
      lines.push("Please sign in using your existing password.");
    }

    return lines.join("\n");
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(getFullMessage());
      setCopiedAll(true);
      toast.success("All login details copied to clipboard");
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleShareWhatsApp = () => {
    const raw = (credentials.phone || "").replace(/\D/g, "");
    const waDigits = raw.length === 10 ? `91${raw}` : raw;
    const text = encodeURIComponent(getFullMessage());
    const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
              {credentials.isNewUser ? <ShieldCheck className="size-4" /> : <KeyRound className="size-4" />}
            </div>
            <DialogTitle>
              {credentials.isNewUser ? "Staff Account Created" : "Staff Login Credentials"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {credentials.isNewUser
              ? "Share these login details with the staff member so they can access My Detail OS."
              : "Share these login credentials and instructions with the staff member."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1 text-sm">
          {/* Staff Info Banner */}
          <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{credentials.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {credentials.phone || "No phone number"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              <Sparkles className="size-3" />
              {credentials.designation || credentials.role.replace(/_/g, " ")}
            </span>
          </div>

          {/* Login URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Login URL</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono truncate text-foreground select-all">
                {loginUrl}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Copy login URL"
                onClick={() => copyToClipboard(loginUrl, "Login URL")}
              >
                {copiedField === "Login URL" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Open login page in new tab"
                asChild
              >
                <a href={loginUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Login Email */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Login Email / Username</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono font-medium truncate text-foreground select-all">
                {credentials.email}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Copy login email"
                onClick={() => copyToClipboard(credentials.email, "Email")}
              >
                {copiedField === "Email" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {credentials.temporaryPassword ? "Temporary Password" : "Password"}
            </Label>
            {credentials.temporaryPassword ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono font-bold tracking-wider truncate text-foreground select-all">
                    {showPassword ? credentials.temporaryPassword : "•".repeat(credentials.temporaryPassword.length)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title="Copy temporary password"
                    onClick={() => copyToClipboard(credentials.temporaryPassword!, "Password")}
                  >
                    {copiedField === "Password" ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  Staff member will be prompted to set their permanent password upon initial sign-in.
                </div>
              </>
            ) : (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">
                Existing password unchanged. Staff member should use their current password.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial gap-1.5"
              onClick={handleCopyAll}
            >
              {copiedAll ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copiedAll ? "Copied All!" : "Copy Details"}
            </Button>
            <Button
              type="button"
              className="flex-1 sm:flex-initial gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white"
              onClick={handleShareWhatsApp}
            >
              <svg className="size-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.791.82 3.181 0 5.768-2.587 5.768-5.766.001-3.182-2.585-5.77-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.227-.563-1.854-.771-3.04-2.655-3.133-2.779-.093-.124-.752-1.002-.752-1.91 0-.909.475-1.356.645-1.54.17-.185.372-.232.497-.232.124 0 .248.001.355.006.113.006.264-.043.413.315.155.372.531 1.298.577 1.393.047.095.078.207.016.331-.062.125-.093.203-.186.311-.093.109-.196.244-.28.327-.093.093-.19.195-.082.381.108.185.481.794 1.033 1.285.711.633 1.31.83 1.497.923.186.093.295.078.404-.047.108-.124.465-.541.589-.728.124-.186.248-.155.418-.093.17.062 1.082.51 1.268.604.186.093.31.14.356.217.047.078.047.45-.097.855z" />
              </svg>
              Share via WhatsApp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
