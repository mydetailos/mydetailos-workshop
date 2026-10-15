"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { buildApiUrl } from "@/lib/api-base";
import { PASSWORD_POLICY_HINT, validateStrongPassword } from "@/lib/password-policy";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  goToMarketingLogin,
  marketingForgotPasswordUrl,
  marketingLoginUrl,
} from "@/lib/marketing-site";

type ResetLinkState = "absent" | "checking" | "active" | "inactive" | "error";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkState, setLinkState] = useState<ResetLinkState>(() =>
    token ? "checking" : "absent"
  );

  useEffect(() => {
    if (!token) {
      setLinkState("absent");
      return;
    }
    let cancelled = false;
    setLinkState("checking");
    void (async () => {
      try {
        const url = `${buildApiUrl("/api/auth/reset-password/status")}?token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const body = (await res.json()) as {
          data?: { pending?: boolean } | null;
          error?: { message?: string } | null;
        };
        if (cancelled) return;
        if (!res.ok || body.error) {
          setLinkState("error");
          return;
        }
        setLinkState(body.data?.pending === true ? "active" : "inactive");
      } catch {
        if (!cancelled) setLinkState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This link is missing a reset token. Open the link from your email again.");
      return;
    }
    const pwErr = validateStrongPassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json()) as {
        data?: { ok?: boolean; message?: string } | null;
        error?: { message?: string } | null;
      };

      if (!res.ok || body.error) {
        setError(body.error?.message ?? "Could not reset password. Try requesting a new link.");
        setLoading(false);
        return;
      }
      toast.success(body.data?.message ?? "Password updated.");
      setSuccess(true);
    } catch {
      setError("Network error — is the API running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.12),transparent_55%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/my-detail-os-mark.png"
              alt="MY DETAIL OS"
              width={56}
              height={56}
              className="mx-auto mb-4 size-14 rounded-2xl object-cover shadow-sm"
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {success ? "Password Updated" : "Reset Password"}
            </h1>
            <p className="mx-auto mt-1.5 max-w-[22rem] text-sm leading-relaxed text-slate-500">
              {success
                ? "Your password has been changed successfully."
                : linkState === "inactive"
                  ? "This reset link was already used or has expired."
                  : linkState === "checking"
                    ? "Hang tight — validating your reset link."
                    : "Enter your new password below to secure your account."}
            </p>
          </div>

          {success ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-green-100">
                <Check className="size-6 text-green-600" />
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                You can now sign in with your new password.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => goToMarketingLogin()}
                  className="h-11 w-full rounded-xl bg-teal-600 text-base font-semibold text-white shadow-sm hover:bg-teal-700 sm:h-12"
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : null}

          {!success && !token ? (
            <div className="space-y-5 text-center">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-sm text-amber-800 leading-relaxed">
                  This page needs a valid link from your reset email. Please request a new link
                  from the forgot password page.
                </p>
              </div>
              <Button asChild className="h-11 w-full rounded-xl bg-teal-600 text-base font-semibold text-white shadow-sm hover:bg-teal-700 sm:h-12">
                <Link href={marketingForgotPasswordUrl()}>Request New Reset Link</Link>
              </Button>
              <p className="text-center text-sm text-slate-600">
                <Link href={marketingLoginUrl()} className="font-semibold text-teal-600 hover:underline">
                  Back to Sign In
                </Link>
              </p>
            </div>
          ) : null}

          {!success && token && linkState === "checking" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <p className="text-sm text-slate-500">Validating your reset link…</p>
            </div>
          ) : null}

          {!success && token && linkState === "inactive" ? (
            <div className="space-y-5 text-center">
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 p-5 space-y-3">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertCircle className="size-5" />
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Password reset links work only once and expire after 1 hour. If you still need to
                  change your password, request a fresh email link.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button asChild className="h-11 w-full rounded-xl bg-teal-600 text-base font-semibold text-white shadow-sm hover:bg-teal-700 sm:h-12">
                  <Link href={marketingForgotPasswordUrl()}>Request New Reset Link</Link>
                </Button>
                <p className="text-center text-sm text-slate-600">
                  <Link href={marketingLoginUrl()} className="font-semibold text-teal-600 hover:underline">
                    Back to Sign In
                  </Link>
                </p>
              </div>
            </div>
          ) : null}

          {!success && token && (linkState === "active" || linkState === "error") ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {linkState === "error" ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Couldn&apos;t verify this link right now. You can still try saving your new
                  password below, or request a fresh link.
                </p>
              ) : null}

              <FloatingInput
                id="new-password"
                type="password"
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />

              <FloatingInput
                id="confirm-password"
                type="password"
                label="Confirm Password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />

              <p className="text-xs text-slate-500 leading-relaxed">{PASSWORD_POLICY_HINT}</p>

              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                >
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                disabled={loading || !password || !confirm}
                className="h-11 w-full rounded-xl bg-teal-600 text-base font-semibold text-white shadow-sm hover:bg-teal-700 sm:h-12 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Updating Password…
                  </>
                ) : (
                  "Save New Password"
                )}
              </Button>

              <p className="text-center text-sm text-slate-600 pt-2">
                <Link href={marketingLoginUrl()} className="font-semibold text-teal-600 hover:underline">
                  Back to Sign In
                </Link>
              </p>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
