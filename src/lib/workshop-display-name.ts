import { useOrganizationStore } from "@/store/organization-store";
import { useSettingsStore } from "@/store/settings-store";
import { parseOrgSlugFromPathname } from "@/lib/tenant";

/** Platform / seed defaults — not a real workshop trade name. */
const PLATFORM_DEFAULT_BUSINESS_NAMES = new Set(["my detail os", "mydetailos"]);

function formatSlugToDisplayName(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Workshop name for customer-facing copy (WhatsApp, SMS, etc.).
 * Prefers branding `businessName` when customized; otherwise organization.name
 * or tenant slug so orgs without appSettings don't show the platform brand.
 */
export function resolveWorkshopDisplayName(opts?: {
  businessName?: string | null;
  organizationName?: string | null;
}): string {
  const fromSettings =
    (opts?.businessName ?? useSettingsStore.getState().businessName)?.trim() || "";
  const fromOrg =
    (
      opts?.organizationName ??
      useOrganizationStore.getState().entitlement?.organization?.name
    )?.trim() || "";

  if (
    fromSettings &&
    !PLATFORM_DEFAULT_BUSINESS_NAMES.has(fromSettings.toLowerCase())
  ) {
    return fromSettings;
  }

  if (fromOrg && !PLATFORM_DEFAULT_BUSINESS_NAMES.has(fromOrg.toLowerCase())) {
    return fromOrg;
  }

  const slug =
    useOrganizationStore.getState().entitlement?.organization?.slug ||
    (typeof window !== "undefined" ? parseOrgSlugFromPathname(window.location.pathname) : null);
  if (slug && !PLATFORM_DEFAULT_BUSINESS_NAMES.has(slug.toLowerCase().replace(/[-_]+/g, " "))) {
    return formatSlugToDisplayName(slug);
  }

  return fromOrg || fromSettings || "MY DETAIL OS";
}
