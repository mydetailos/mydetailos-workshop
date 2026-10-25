"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { goToMarketingLogin } from "@/lib/marketing-site";
import { parseOrgSlugFromPathname, tenantPath } from "@/lib/tenant";
import {
  completeStaffAuthHandoff,
  readAccessTokenFromLocation,
} from "@/lib/auth-handoff";
import { BootOverlay } from "@/components/shared/boot-overlay";

/**
 * Password change on forced login is deprecated — users sign in with OTP.
 * Anyone landing on this route is immediately redirected straight to the dashboard.
 */
export default function ChangePasswordPage() {
  const pathname = usePathname();
  const [authReady, setAuthReady] = useState(false);
  const [handoffDone, setHandoffDone] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      queueMicrotask(() => setAuthReady(true));
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setAuthReady(true));
    return unsub;
  }, []);

  /** Complete SSO handoff if landing directly on /change-password#accessToken=… */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = readAccessTokenFromLocation();
      const orgSlug = parseOrgSlugFromPathname(pathname);
      if (!token) {
        if (!cancelled) setHandoffDone(true);
        return;
      }
      const result = await completeStaffAuthHandoff(token, orgSlug);
      if (cancelled) return;
      if (!result.ok) {
        goToMarketingLogin();
        return;
      }
      window.location.replace(tenantPath(orgSlug, "/dashboard"));
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!authReady || !handoffDone) return;
    const token = readAccessTokenFromLocation();
    if (!token && !accessToken) {
      goToMarketingLogin();
      return;
    }
    const orgSlug = parseOrgSlugFromPathname(pathname);
    window.location.replace(tenantPath(orgSlug, "/dashboard"));
  }, [authReady, handoffDone, accessToken, pathname]);

  return <BootOverlay />;
}
