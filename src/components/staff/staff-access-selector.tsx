"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert } from "lucide-react";
import type { StaffAccessLevel } from "@/lib/staff-access";
import { cn } from "@/lib/utils";

export type StaffAccessSelectorProps = {
  value: StaffAccessLevel;
  onChange: (value: StaffAccessLevel) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  showPortalToggle?: boolean;
  portalAccess?: boolean;
  onPortalAccessChange?: (enabled: boolean) => void;
};

export function StaffAccessSelector({
  value,
  onChange,
  disabled = false,
  name = "staff-access",
  className,
  showPortalToggle = false,
  portalAccess = true,
  onPortalAccessChange,
}: StaffAccessSelectorProps) {
  const options: { value: StaffAccessLevel; title: string; description: string }[] = [
    {
      value: "withEditAccess",
      title: "With Edit Access",
      description: "Full normal access including edit.",
    },
    {
      value: "withoutEditAccess",
      title: "Without Edit Access",
      description: "Normal access, but no edit/delete.",
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {showPortalToggle && onPortalAccessChange && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30 dark:bg-muted/10 transition-colors">
          <div className="space-y-0.5 pr-4">
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`${name}-portal-toggle`}
                className={cn(
                  "text-sm font-semibold",
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                )}
              >
                Portal Access
              </Label>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                  portalAccess
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                )}
              >
                {portalAccess ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Allow this user or staff to log in and use the workshop portal. Turn off if this user does not need portal access (e.g. floor mechanics, cleaners, attendance only).
            </p>
          </div>
          <Switch
            id={`${name}-portal-toggle`}
            checked={portalAccess}
            onCheckedChange={onPortalAccessChange}
            disabled={disabled}
          />
        </div>
      )}

      {portalAccess ? (
        <div className="space-y-2">
          <Label>Access</Label>
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex gap-3 rounded-lg border p-3 transition-colors",
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  value === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  disabled={disabled}
                  onChange={() => onChange(option.value)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-lg border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Portal access is turned off</p>
            <p className="text-muted-foreground mt-0.5">
              This staff member will not be able to log in to the workshop web portal. Profile data, attendance tracking, and job assignments remain available in the workshop.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
