"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogMobileSheetContentClasses,
  dialogMobileSheetHeaderClasses,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NewCustomerReferralCodeField } from "@/components/customers/new-customer-referral-code-field";
import { useCustomerStore } from "@/store/customer-store";
import { normalizePhoneDigits } from "@/lib/phone";
import { referredByFromOptionalInput } from "@/lib/referral-eligibility";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

export type AddCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onCreated?: (customer: Customer) => void;
};

export function AddCustomerDialog({
  open,
  onOpenChange,
  title = "Add Customer",
  onCreated,
}: AddCustomerDialogProps) {
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const findByReferralCode = useCustomerStore((s) => s.findByReferralCode);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setReferralCode("");
    setSaving(false);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = normalizePhoneDigits(phone);

    if (!cleanName) {
      toast.error("Customer name is required");
      return;
    }

    if (cleanPhone.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    const referred = referredByFromOptionalInput(referralCode, findByReferralCode);
    if (referred.error) {
      toast.error(referred.error);
      return;
    }

    setSaving(true);
    try {
      const created = await addCustomer({
        name: cleanName,
        phone: cleanPhone,
        email: email.trim() || "",
        address: address.trim() || "",
        referralCode: `REF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        referredBy: referred.referredBy,
        totalVisits: 0,
        rewardPoints: 0,
        walletBalance: 0,
      });

      if (!created) {
        toast.error("This phone number is already registered", {
          description: "A customer with this phone number already exists in your workshop.",
        });
        return;
      }

      toast.success("Customer added", {
        description: `${cleanName} has been added successfully.`,
      });

      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not add customer", {
        description: err instanceof Error ? err.message : "Please check your network and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogMobileSheetContentClasses, "max-h-[90vh] sm:max-w-md")}>
        <DialogHeader className={dialogMobileSheetHeaderClasses}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Register a customer to link vehicle inspections and job cards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-cust-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-cust-phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-cust-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile"
                maxLength={10}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-cust-email">Email (Optional)</Label>
              <Input
                id="add-cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-cust-address">Address (Optional)</Label>
              <Textarea
                id="add-cust-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, city, pin code"
                rows={2}
              />
            </div>
            <NewCustomerReferralCodeField
              id="add-cust-referral"
              value={referralCode}
              onChange={setReferralCode}
              compact
            />
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
