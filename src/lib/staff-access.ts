import { PERMISSION_KEYS } from "@/lib/permission-keys";
import { getDefaultModuleKeysForRole } from "@/lib/staff-role-defaults";
import type { User, UserRole } from "@/types";

export type StaffAccessLevel = "withEditAccess" | "withoutEditAccess";

/** Sidebar / command-menu group label for HR modules. */
export const HR_STAFF_NAV_GROUP_LABEL = "HR & staff";

/**
 * HR & Staff routes hidden for Without Edit Access users.
 * Leave stays available so staff can still apply for leave.
 */
export const HR_STAFF_NAV_HREFS = [
  "/staff",
  "/attendance",
  "/rewards",
  "/performance",
  "/payroll",
] as const;

/**
 * HR modules stripped for Without Edit Access (Leave is kept).
 */
export const HR_STAFF_MODULE_KEYS = [
  "STAFF",
  "ATTENDANCE",
  "PAYROLL",
  "STAFF_REWARDS",
  "PERFORMANCE",
] as const;

const MODULE_KEYS = new Set<string>(PERMISSION_KEYS);
const HR_MODULE_KEY_SET = new Set<string>(HR_STAFF_MODULE_KEYS);

function expandLegacyBaseKeys(perms: string[]): string[] {
  const out = new Set<string>();
  for (const perm of perms) {
    if (MODULE_KEYS.has(perm)) {
      out.add(`${perm}_CREATE`);
      out.add(`${perm}_VIEW`);
      out.add(`${perm}_EDIT`);
    } else {
      out.add(perm);
    }
  }
  return [...out];
}

function isHrStaffPermissionKey(perm: string): boolean {
  if (HR_MODULE_KEY_SET.has(perm)) return true;
  const match = /^(.+)_(CREATE|VIEW|EDIT|DELETE)$/.exec(perm);
  return Boolean(match?.[1] && HR_MODULE_KEY_SET.has(match[1]));
}

/**
 * Sentinel permission key stored when an admin disables workshop portal access for a user.
 * Allows zero-migration persistence inside the existing User.permissions array.
 */
export const NO_PORTAL_ACCESS_KEY = "NO_PORTAL_ACCESS";

/** Check whether a permissions array indicates portal access is granted. */
export function permissionsHavePortalAccess(permissions: string[] | undefined): boolean {
  const perms = permissions ?? [];
  return !perms.includes(NO_PORTAL_ACCESS_KEY);
}

/** Check whether a user has permission to log in and use the workshop portal. */
export function userHasPortalAccess(
  user: Pick<User, "role" | "permissions"> | null | undefined
): boolean {
  if (!user?.role) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;
  return permissionsHavePortalAccess(user.permissions);
}

/** Infer access level from stored permission keys (best-effort). */
export function deriveStaffAccessLevel(permissions: string[] | undefined): StaffAccessLevel {
  const perms = permissions ?? [];
  if (perms.includes(NO_PORTAL_ACCESS_KEY)) return "withoutEditAccess";
  // Explicit edit grants always mean With Edit Access.
  if (perms.some((p) => p.endsWith("_EDIT"))) return "withEditAccess";

  const hasGranular = perms.some((p) => /_(CREATE|VIEW|EDIT|DELETE)$/.test(p));
  // Legacy full-access payloads used bare module keys with no granular breakdown.
  if (!hasGranular && perms.some((p) => MODULE_KEYS.has(p))) return "withEditAccess";

  // Granular CREATE/VIEW (and no EDIT) → Without Edit Access, even if a stray
  // base key like DASHBOARD remains in the array.
  return "withoutEditAccess";
}

/**
 * True when the user is on Without Edit Access.
 * Admins / Super Admins always have full access (role bypass).
 */
export function userHasWithoutEditAccess(
  user: Pick<User, "role" | "permissions"> | null | undefined
): boolean {
  if (!user?.role) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return false;
  return deriveStaffAccessLevel(user.permissions) === "withoutEditAccess";
}

export function isHrStaffNavPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0] ?? pathname;
  return HR_STAFF_NAV_HREFS.some((href) => path === href || path.startsWith(`${href}/`));
}

export function isHrStaffNavHref(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? href;
  return HR_STAFF_NAV_HREFS.some((hr) => path === hr || path.startsWith(`${hr}/`));
}

/**
 * Map the simplified access choice onto the existing permissions array shape.
 * Uses granular CREATE / VIEW / EDIT keys only — no API contract changes.
 */
export function permissionsForStaffAccessLevel(
  current: string[] | undefined,
  level: StaffAccessLevel,
  role?: UserRole
): string[] {
  // Strip any NO_PORTAL_ACCESS sentinel before deriving active module permissions
  const cleaned = (current ?? []).filter((p) => p !== NO_PORTAL_ACCESS_KEY);
  let basePerms = cleaned;
  // If the user has no permissions (e.g. legacy, cleared, or previously disabled portal),
  // applying an access level should bootstrap them with their role defaults.
  if (basePerms.length === 0 && role) {
    const defaultModules = getDefaultModuleKeysForRole(role);
    basePerms = defaultModules.flatMap((m) => [`${m}_CREATE`, `${m}_VIEW`]);
  }

  const expanded = expandLegacyBaseKeys(basePerms).filter(
    (p) => !p.endsWith("_DELETE") && p !== NO_PORTAL_ACCESS_KEY
  );

  if (level === "withoutEditAccess") {
    // No edit/delete; strip HR modules except Leave (users can still apply for leave).
    const next = expanded.filter(
      (p) => !p.endsWith("_EDIT") && !MODULE_KEYS.has(p) && !isHrStaffPermissionKey(p)
    );
    if (!next.includes("LEAVE_VIEW")) next.push("LEAVE_VIEW");
    if (!next.includes("LEAVE_CREATE")) next.push("LEAVE_CREATE");
    return next;
  }

  const next = new Set(expanded.filter((p) => !MODULE_KEYS.has(p)));
  const modules = new Set<string>();
  for (const perm of next) {
    const match = /^(.+)_(CREATE|VIEW|EDIT)$/.exec(perm);
    if (match?.[1]) modules.add(match[1]);
  }
  for (const mod of modules) {
    if (next.has(`${mod}_CREATE`) || next.has(`${mod}_VIEW`)) {
      next.add(`${mod}_EDIT`);
    }
  }
  return [...next];
}
