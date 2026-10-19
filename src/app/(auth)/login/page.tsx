"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  completeStaffAuthHandoff,
  readAccessTokenFromLocation,
} from "@/lib/auth-handoff";
import { goToMarketingLogin } from "@/lib/marketing-site";
import { parseOrgSlugFromPathname, tenantPath } from "@/lib/tenant";
import { BootOverlay } from "@/components/shared/boot-overlay";

/**
 * Legacy SSO entry: /login#accessToken=…&next=/dashboard
 * Prefer marketing → /{slug}/dashboard#accessToken=… (one page load).
 * Kept so bookmarks and direct login links still work seamlessly.
 */
function readNextParam(searchParams: URLSearchParams): string {
  if (typeof window === "undefined") {
    return searchParams.get("next") || "/dashboard";
  }
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hashParams.get("next") || searchParams.get("next") || "/dashboard";
}

function resolveOrgSlug(pathname: string): string | null {
  const fromPath = parseOrgSlugFromPathname(pathname);
  if (fromPath) return fromPath;
  if (typeof window === "undefined") return null;
  return parseOrgSlugFromPathname(window.location.pathname);
}

function LoginHandoffPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = readAccessTokenFromLocation() || searchParams.get("accessToken");
    const orgSlug = resolveOrgSlug(pathname);
    const next = readNextParam(searchParams);
    if (!token) {
      goToMarketingLogin();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await completeStaffAuthHandoff(token, orgSlug);
        if (cancelled) return;
        if (!result.ok) {
          if (result.reason === "inactive") {
            setError("This workshop is inactive.");
            return;
          }
          goToMarketingLogin();
          return;
        }

        const mustChange = result.user.mustChangePassword === true;
        const role = result.user.role;
        let dest = next;
        if (mustChange) dest = "/change-password";
        else if (role === "PLATFORM_OWNER") dest = "/saas-admin/organizations";
        else if (role === "CUSTOMER") dest = "/customer/dashboard";

        if (role !== "PLATFORM_OWNER") {
          dest = tenantPath(orgSlug, dest);
        }

        // Hard navigation to dashboard
        window.location.replace(dest);
      } catch {
        if (!cancelled) goToMarketingLogin();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return <BootOverlay />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<BootOverlay />}>
      <LoginHandoffPage />
    </Suspense>
  );
}
