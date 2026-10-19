"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  completeStaffAuthHandoff,
  readAccessTokenFromLocation,
} from "@/lib/auth-handoff";
import { parseOrgSlugFromPathname, tenantPath } from "@/lib/tenant";
import { BootOverlay } from "@/components/shared/boot-overlay";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { LoginHeroPanel } from "@/components/shared/login-hero-panel";
import { resolveUploadsPublicUrl, buildApiUrl } from "@/lib/api-base";
import { apiGet } from "@/lib/api-client";
import { applyBrandCssVars, DEFAULT_BRAND_PRIMARY } from "@/lib/brand-color";
import {
  DEFAULT_LOGIN_HERO_DESCRIPTION,
  DEFAULT_LOGIN_HERO_FEATURES,
  DEFAULT_LOGIN_HERO_HEADING,
  type LoginHeroFeature,
} from "@/lib/login-hero-content";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Smartphone,
  Mail,
  Wrench,
  Loader2,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import type { User, Branch } from "@/types";

type PublicBranding = {
  businessName: string;
  businessLogo: string;
  brandPrimary: string;
  loginBackgroundImage: string;
  loginHeroHeading: string;
  loginHeroDescription: string;
  loginHeroFeatures: LoginHeroFeature[];
};

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
  if (typeof window !== "undefined") {
    return parseOrgSlugFromPathname(window.location.pathname);
  }
  return null;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const applyAuthPayload = useAuthStore((s) => s.applyAuthPayload);
  const sendLoginOtp = useAuthStore((s) => s.sendLoginOtp);
  const verifyLoginOtp = useAuthStore((s) => s.verifyLoginOtp);

  const orgSlug = resolveOrgSlug(pathname);
  const next = readNextParam(searchParams);

  // Check if SSO token exists in URL hash or query params
  const [ssoToken] = useState<string | null>(() => {
    return readAccessTokenFromLocation() || searchParams.get("accessToken");
  });
  const [handoffActive, setHandoffActive] = useState<boolean>(() => Boolean(ssoToken));
  const [handoffError, setHandoffError] = useState<string | null>(null);

  // Form states
  const [loginMethod, setLoginMethod] = useState<"email" | "mobile">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const verifyOtpLock = useRef(false);

  // If already authenticated and not doing SSO handoff, redirect to dashboard
  useEffect(() => {
    if (handoffActive) return;
    const storeState = useAuthStore.getState();
    if (storeState.isAuthenticated && storeState.user && storeState.accessToken) {
      let dest = next || "/dashboard";
      if (storeState.user.mustChangePassword === true) dest = "/change-password";
      else if (storeState.user.role === "PLATFORM_OWNER") dest = "/saas-admin/organizations";
      else if (storeState.user.role === "CUSTOMER") dest = "/customer/dashboard";
      if (storeState.user.role !== "PLATFORM_OWNER" && orgSlug) {
        dest = tenantPath(orgSlug, dest);
      }
      window.location.replace(dest);
    }
  }, [handoffActive, next, orgSlug]);

  // Execute SSO token handoff if token is present
  useEffect(() => {
    if (!ssoToken) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await completeStaffAuthHandoff(ssoToken, orgSlug);
        if (cancelled) return;
        if (!result.ok) {
          if (result.reason === "inactive") {
            setHandoffError("This workshop is inactive.");
            setHandoffActive(false);
            return;
          }
          // Failed token handoff -> allow standard login
          setHandoffError("Your sign-in link expired or is invalid. Please sign in below.");
          setHandoffActive(false);
          return;
        }

        const mustChange = result.user.mustChangePassword === true;
        const role = result.user.role;
        let dest = next || "/dashboard";
        if (mustChange) dest = "/change-password";
        else if (role === "PLATFORM_OWNER") dest = "/saas-admin/organizations";
        else if (role === "CUSTOMER") dest = "/customer/dashboard";

        if (role !== "PLATFORM_OWNER" && orgSlug) {
          dest = tenantPath(orgSlug, dest);
        }

        window.location.replace(dest);
      } catch {
        if (!cancelled) {
          setHandoffError("Could not complete automatic sign-in. Please sign in below.");
          setHandoffActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ssoToken, orgSlug, next]);

  // Fetch workshop branding
  useEffect(() => {
    let cancelled = false;
    const brandingPath = orgSlug
      ? `/api/public/branding?slug=${encodeURIComponent(orgSlug)}`
      : "/api/public/branding";

    void apiGet<PublicBranding>(brandingPath)
      .then((data) => {
        if (cancelled) return;
        setBranding(data);
        if (data?.brandPrimary) {
          applyBrandCssVars(data.brandPrimary || DEFAULT_BRAND_PRIMARY);
        }
      })
      .catch(() => {
        /* Keep defaults */
      });

    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  // Handle post-login destination
  const handleLoginSuccess = (user: User) => {
    const mustChange = user.mustChangePassword === true;
    const role = user.role;
    let dest = next || "/dashboard";
    if (mustChange) dest = "/change-password";
    else if (role === "PLATFORM_OWNER") dest = "/saas-admin/organizations";
    else if (role === "CUSTOMER") dest = "/customer/dashboard";

    if (role !== "PLATFORM_OWNER" && orgSlug) {
      dest = tenantPath(orgSlug, dest);
    }
    window.location.replace(dest);
  };

  // Email & Password login submit
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const body = (await res.json()) as {
        data: {
          accessToken: string;
          user: User;
          branch: Branch | null;
        } | null;
        error: { message?: string } | null;
      };

      if (!res.ok || body.error || !body.data) {
        setError(body.error?.message ?? "Invalid email or password. Please try again.");
        return;
      }

      applyAuthPayload(body.data);
      handleLoginSuccess(body.data.user);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Mobile OTP send
  const handleSendOtp = async () => {
    const raw = mobile.trim();
    const digits = raw.replace(/\D/g, "");
    const core = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    if (core.length !== 10) {
      const msg = "Enter a valid 10-digit mobile number";
      setError(msg);
      toast.error(msg);
      return;
    }
    setError(null);
    setLoading(true);
    const result = await sendLoginOtp(core);
    setLoading(false);
    if (result.ok) {
      setOtp("");
      setOtpSent(true);
      if (result.delivery === "sms") {
        toast.success("OTP sent to your mobile number");
      } else if (result.devDemoCode) {
        toast.success("Verification code", {
          description: `Use code ${result.devDemoCode} to sign in.`,
          duration: 12_000,
        });
      } else if (result.hint) {
        toast.warning("OTP not sent via SMS", {
          description: result.hint,
          duration: 10_000,
        });
      } else {
        toast.success("OTP ready — check SMS or server logs");
      }
    } else {
      setError(result.message);
      toast.error(result.message);
    }
  };

  // Mobile OTP verify
  const runMobileOtpVerify = async (code?: string) => {
    const raw = mobile.trim();
    const digits = raw.replace(/\D/g, "");
    const core = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
    const otpCode = (code ?? otp).replace(/\D/g, "");
    if (otpCode.length < 4 || verifyOtpLock.current) return;
    verifyOtpLock.current = true;
    setError(null);
    setLoading(true);

    try {
      const success = await verifyLoginOtp(core, otpCode);
      if (success) {
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          handleLoginSuccess(authUser);
        } else {
          window.location.replace("/dashboard");
        }
      } else {
        setError("Invalid or expired OTP. Please try again.");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
      verifyOtpLock.current = false;
    }
  };

  // If SSO token handoff is currently processing, show overlay
  if (handoffActive) {
    return <BootOverlay />;
  }

  const businessName = branding?.businessName?.trim() || "MY DETAIL OS";
  const logoUrl = resolveUploadsPublicUrl(branding?.businessLogo);
  const loginBgUrl = resolveUploadsPublicUrl(branding?.loginBackgroundImage);
  const heroHeading = branding?.loginHeroHeading?.trim() || DEFAULT_LOGIN_HERO_HEADING;
  const heroDescription =
    branding?.loginHeroDescription?.trim() || DEFAULT_LOGIN_HERO_DESCRIPTION;
  const heroFeatures =
    branding?.loginHeroFeatures !== undefined && branding.loginHeroFeatures.length > 0
      ? branding.loginHeroFeatures
      : DEFAULT_LOGIN_HERO_FEATURES;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding Hero (Desktop) */}
      <LoginHeroPanel
        className="hidden lg:flex lg:w-[52%] min-h-screen"
        businessName={businessName}
        logoUrl={logoUrl}
        backgroundUrl={loginBgUrl}
        heading={heroHeading}
        description={heroDescription}
        features={heroFeatures}
      />

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-between min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[420px] mx-auto my-auto">
          {/* Header & Logo */}
          <div className="flex items-center gap-3 mb-8">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 rounded-xl object-cover shadow-sm border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                <Wrench className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-base font-bold tracking-tight text-foreground block leading-tight">
                {businessName}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Workshop & Staff Portal
              </span>
            </div>
          </div>

          <div className="space-y-1.5 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Sign in to your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your workshop dashboard.
            </p>
          </div>

          {/* Handoff or general error */}
          {(handoffError || error) && (
            <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-snug">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{handoffError || error}</p>
            </div>
          )}

          {/* Email / Password Form */}
          {loginMethod === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address or Login ID
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your email or login ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-3.5 pl-10"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-3.5 pl-10 pr-11"
                  />
                  <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          ) : (
            /* Mobile OTP Form */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-sm font-medium">
                  Mobile Number
                </Label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center h-11 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-muted-foreground shrink-0">
                    +91
                  </div>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                    maxLength={10}
                    disabled={otpSent}
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-3.5"
                  />
                </div>
              </div>

              {!otpSent ? (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full h-11 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all"
                  disabled={loading || mobile.length < 10}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending OTP...
                    </span>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="otp" className="text-sm font-medium">
                        Enter 4-Digit Code
                      </Label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline"
                        disabled={loading}
                      >
                        Resend code
                      </button>
                    </div>
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      onComplete={(v) => void runMobileOtpVerify(v)}
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void runMobileOtpVerify()}
                    className="w-full h-11 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20"
                    disabled={loading || otp.length < 4}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Verify & Sign in
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setError(null);
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  >
                    Use a different mobile number
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Switch Login Method */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-[11px] text-muted-foreground uppercase font-medium tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={() => {
              setLoginMethod(loginMethod === "email" ? "mobile" : "email");
              setError(null);
              setOtp("");
              setOtpSent(false);
            }}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-foreground hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
          >
            {loginMethod === "email" ? (
              <>
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                Sign in with Mobile OTP
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 text-muted-foreground" />
                Sign in with Email & Password
              </>
            )}
          </button>

          {/* Staff onboarding hint */}
          <div className="mt-8 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-3.5 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-teal-600" />
              New staff member?
            </p>
            <p>
              Sign in with the temporary password provided by your workshop admin. You will be prompted to set your permanent password on first sign-in.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-[420px] mx-auto pt-6 text-center text-xs text-muted-foreground">
          <Link
            href="/customer-login"
            className="hover:text-foreground text-teal-600 dark:text-teal-400 font-medium transition-colors"
          >
            Are you a customer? Go to Customer Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<BootOverlay />}>
      <LoginContent />
    </Suspense>
  );
}
