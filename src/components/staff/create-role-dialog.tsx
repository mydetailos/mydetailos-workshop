"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  Crown,
  Building2,
  UserCog,
  UserCheck,
  Headset,
  WrenchIcon,
  Sparkles,
} from "lucide-react";
import type { UserRole } from "@/types";
import { useCustomRoleStore } from "@/store/custom-role-store";
import { getDefaultModuleKeysForRole } from "@/lib/staff-role-defaults";
import { permissionsForStaffAccessLevel } from "@/lib/staff-access";
import { toast } from "sonner";

const BASE_ROLE_INFO: {
  value: UserRole;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "ADMIN",
    label: "Admin",
    icon: Shield,
    description: "Full management and workshop operations",
  },
  {
    value: "BRANCH_MANAGER",
    label: "Branch Manager",
    icon: Building2,
    description: "Operational leadership and oversight for branch operations",
  },
  {
    value: "MANAGER",
    label: "Manager",
    icon: UserCog,
    description: "Manages day-to-day operations, billing, and team scheduling",
  },
  {
    value: "SUPERVISOR",
    label: "Supervisor",
    icon: UserCheck,
    description: "Supervises detailing bays, pricing, and job progress",
  },
  {
    value: "RECEPTIONIST",
    label: "Receptionist",
    icon: Headset,
    description: "Front-desk intake, customer care, and appointment booking",
  },
  {
    value: "MECHANIC",
    label: "Mechanic / Technician",
    icon: WrenchIcon,
    description: "Hands-on vehicle detailing and workshop tasks",
  },
];

const AVAILABLE_MODULES: { key: string; label: string; group: string }[] = [
  { key: "DASHBOARD", label: "Dashboard & KPIs", group: "General" },
  { key: "JOB_CARDS", label: "Job Cards", group: "Workshop Ops" },
  { key: "JOB_CARD_PRICING", label: "Job Card Pricing", group: "Workshop Ops" },
  { key: "BOOKINGS", label: "Bookings", group: "Workshop Ops" },
  { key: "APPOINTMENTS", label: "Appointments", group: "Workshop Ops" },
  { key: "QUOTATIONS", label: "Estimates & Quotations", group: "Workshop Ops" },
  { key: "PICKUP_DROP", label: "Pickup & Drop", group: "Workshop Ops" },
  { key: "CUSTOMERS", label: "Customers & CRM", group: "Customer" },
  { key: "VEHICLES", label: "Vehicles Database", group: "Customer" },
  { key: "MEMBERSHIP", label: "Memberships & Packages", group: "Customer" },
  { key: "BILLING", label: "Invoices & Billing", group: "Financial" },
  { key: "EXPENSES", label: "Expenses & Vendors", group: "Financial" },
  { key: "CASH_BANK", label: "Cash & Bank Accounts", group: "Financial" },
  { key: "REPORTS", label: "Reports & Analytics", group: "Financial" },
  { key: "INVENTORY", label: "Inventory & Spare Parts", group: "Inventory" },
  { key: "SERVICES", label: "Services Catalog", group: "Inventory" },
  { key: "STAFF", label: "Staff & Users Directory", group: "HR & Staff" },
  { key: "ATTENDANCE", label: "Attendance Tracking", group: "HR & Staff" },
  { key: "LEAVE", label: "Leave Management", group: "HR & Staff" },
  { key: "PAYROLL", label: "Payroll & Salary", group: "HR & Staff" },
  { key: "STAFF_REWARDS", label: "Staff Rewards & Incentives", group: "HR & Staff" },
  { key: "REMINDERS", label: "Service Reminders", group: "Engagement" },
  { key: "FOLLOW_UPS", label: "Customer Follow-ups", group: "Engagement" },
  { key: "MESSAGES", label: "WhatsApp & SMS Communications", group: "Engagement" },
];

export interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleCreated?: (roleId: string, roleName: string) => void;
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  onRoleCreated,
}: CreateRoleDialogProps) {
  const { customRoles, addRole, deleteRole } = useCustomRoleStore();
  const [tab, setTab] = useState<"create" | "directory">("create");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseRole, setBaseRole] = useState<UserRole>("SUPERVISOR");
  const [accessLevel, setAccessLevel] = useState<"withEditAccess" | "withoutEditAccess">("withEditAccess");
  const [selectedModules, setSelectedModules] = useState<string[]>(() => [
    ...((getDefaultModuleKeysForRole("SUPERVISOR") as string[]) || []),
  ]);

  const handleBaseRoleChange = (newBase: UserRole) => {
    setBaseRole(newBase);
    const defaultMods = (getDefaultModuleKeysForRole(newBase) as string[]) || [];
    setSelectedModules(defaultMods);
  };

  const toggleModule = (moduleKey: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const selectAllModules = () => {
    setSelectedModules(AVAILABLE_MODULES.map((m) => m.key));
  };

  const clearAllModules = () => {
    setSelectedModules(["DASHBOARD"]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a role name.");
      return;
    }

    if (customRoles.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A role with this name already exists.");
      return;
    }

    const calculatedPermissions = permissionsForStaffAccessLevel(
      selectedModules,
      accessLevel,
      baseRole
    );

    const created = addRole({
      name: trimmed,
      description: description.trim() || undefined,
      baseRole,
      permissions: calculatedPermissions,
      accessLevel,
      badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    });

    toast.success(`Role "${trimmed}" created successfully.`);
    setName("");
    setDescription("");
    onOpenChange(false);
    onRoleCreated?.(created.id, created.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <Shield className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Role Management</DialogTitle>
              <DialogDescription>
                Create custom workshop roles and configure permission templates.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "directory")}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="create">
              <Plus className="size-4 mr-1.5" />
              Create Role
            </TabsTrigger>
            <TabsTrigger value="directory">
              <Shield className="size-4 mr-1.5" />
              Existing Roles ({customRoles.length + BASE_ROLE_INFO.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name" className="text-sm font-semibold">
                    Role Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="role-name"
                    placeholder="e.g. Service Advisor, Detailing Lead, Accountant"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-role" className="text-sm font-semibold">
                    Base System Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={baseRole}
                    onValueChange={(v) => handleBaseRoleChange(v as UserRole)}
                  >
                    <SelectTrigger id="base-role">
                      <SelectValue placeholder="Select base system role" />
                    </SelectTrigger>
                    <SelectContent>
                      {BASE_ROLE_INFO.map((role) => {
                        const Icon = role.icon;
                        return (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4 text-muted-foreground" />
                              <span>{role.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Determines backend authentication tier and seat category.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description" className="text-sm font-semibold">
                  Description <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="role-description"
                  placeholder="Describe duties, responsibilities, or target staff for this role..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Access Level Preset</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessLevel("withEditAccess")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      accessLevel === "withEditAccess"
                        ? "border-teal-600 bg-teal-50/50 dark:bg-teal-950/20 ring-1 ring-teal-600"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      With Edit Access
                      {accessLevel === "withEditAccess" && (
                        <CheckCircle2 className="size-4 text-teal-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Full view, create, and modification capabilities across selected modules.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessLevel("withoutEditAccess")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      accessLevel === "withoutEditAccess"
                        ? "border-teal-600 bg-teal-50/50 dark:bg-teal-950/20 ring-1 ring-teal-600"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      View Only Access
                      {accessLevel === "withoutEditAccess" && (
                        <CheckCircle2 className="size-4 text-teal-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Read-only inspection and operational viewing; no edits or billing changes.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Module Access ({selectedModules.length} selected)
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllModules}
                      className="text-xs text-teal-600 hover:underline font-medium"
                    >
                      Select all
                    </button>
                    <span className="text-xs text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={clearAllModules}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/20 max-h-52 overflow-y-auto">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleModule(mod.key)}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {mod.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm"
                >
                  <Sparkles className="size-4 mr-1.5" />
                  Save Role
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="directory" className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Custom Roles ({customRoles.length})
              </h3>
              {customRoles.length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                  <Shield className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No custom roles created yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click &ldquo;Create Role&rdquo; above to define specialized workshop roles.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {customRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {role.name}
                          </span>
                          <Badge variant="outline" className="text-[11px] bg-teal-50 text-teal-700 border-teal-200">
                            Custom Role
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            Base: {role.baseRole}
                          </Badge>
                        </div>
                        {role.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {role.description}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          {role.permissions.length} module permissions • {role.accessLevel === "withEditAccess" ? "Edit Access" : "View Only"}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          deleteRole(role.id);
                          toast.success(`Role "${role.name}" deleted.`);
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4">
                System Default Roles ({BASE_ROLE_INFO.length + 1})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-xl border bg-slate-50/70 dark:bg-slate-900/30 space-y-1">
                  <div className="flex items-center gap-2">
                    <Crown className="size-4 text-violet-600" />
                    <span className="font-semibold text-sm">Super Admin</span>
                    <Badge variant="outline" className="text-[10px]">System</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full unrestricted platform access, branch CRUD, and subscription administration.
                  </p>
                </div>
                {BASE_ROLE_INFO.map((role) => {
                  const Icon = role.icon;
                  return (
                    <div
                      key={role.value}
                      className="p-3 rounded-xl border bg-slate-50/70 dark:bg-slate-900/30 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-teal-600" />
                        <span className="font-semibold text-sm">{role.label}</span>
                        <Badge variant="outline" className="text-[10px]">System</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
