"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuthStore } from "@/store/customer-auth-store";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { apiGet } from "@/lib/api-client";
import { resolveUploadsPublicUrl } from "@/lib/api-base";
import { useTenantPath, useTenantSlug } from "@/components/tenant/tenant-context";
import { marketingHomeUrl } from "@/lib/marketing-site";
import { cn } from "@/lib/utils";

type LoginMethod = "otp" | "password";

type PublicBranding = {
  businessName: string;
  businessLogo: string;
  brandPrimary: string;
};

function FloatingField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
  autoComplete,
  trailing,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="relative w-full mt-2 mb-4">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || " "}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={cn(
          "peer block w-full rounded-md border-2 border-slate-300 bg-transparent px-3 py-3 text-slate-900 placeholder:text-transparent focus:border-teal-600 focus:placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          trailing && "pr-11"
        )}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-0 peer-focus:text-sm peer-focus:text-teal-600"
      >
        {label}
      </label>
      {trailing ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
      ) : null}
    </div>
  );
}

export default function CustomerLoginPage() {
  const router = useRouter();
  const orgSlug = useTenantSlug();
  const tenantHref = useTenantPath();
  const { login, sendOtp, loginWithOtp, isAuthenticated } = useCustomerAuthStore();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("otp");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const verifyLock = useRef(false);

  useEffect(() => {
    if (!orgSlug) {
      window.location.replace(marketingHomeUrl());
    }
  }, [orgSlug]);

  useEffect(() => {
    if (!orgSlug) return;
    if (isAuthenticated) {
      router.replace(tenantHref("/customer/dashboard"));
    }
  }, [isAuthenticated, router, tenantHref, orgSlug]);

  useEffect(() => {
    if (!orgSlug) return;
    let cancelled = false;
    void apiGet<PublicBranding>(
      `/api/public/branding?slug=${encodeURIComponent(orgSlug)}`
    )
      .then((data) => {
        if (!cancelled) setBranding(data);
      })
      .catch(() => {
        /* Keep defaults if API fails */
      });
    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  useEffect(() => {
    if (!otpSent || resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpSent, resendCountdown]);

  if (!orgSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 rounded-full border-2 border-teal-600/30 border-t-teal-600 animate-spin" />
      </div>
    );
  }

  function switchMethod(method: LoginMethod) {
    if (loginMethod === method) return;
    setLoginMethod(method);
    setError(null);
    setOtp("");
    setOtpSent(false);
    setOtpHint(null);
    setResendCountdown(0);
  }

  async function handleSendOtp() {
    if (resendCountdown > 0 && otpSent) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError(null);
    setOtpHint(null);
    setLoading(true);

    const result = await sendOtp(digits, orgSlug);
    setLoading(false);

    if (result.ok) {
      setOtp("");
      setOtpSent(true);
      setResendCountdown(30);
      if (result.delivery === "whatsapp") {
        setOtpHint("OTP sent to your WhatsApp number.");
      } else if (result.hint) {
        setOtpHint(result.hint);
      } else {
        setOtpHint("OTP sent to your WhatsApp number.");
      }
      toast.success("Verification code sent via WhatsApp");
    } else {
      setError(result.message);
      toast.error(result.message);
      if (!otpSent) setOtpSent(false);
    }
  }

  async function runOtpVerify(code?: string) {
    const digits = (code ?? otp).replace(/\D/g, "");
    if ((digits.length !== 6 && digits.length !== 4) || verifyLock.current) return;
    verifyLock.current = true;
    setError(null);
    setLoading(true);

    const result = await loginWithOtp(phone, digits, orgSlug);
    setLoading(false);

    if (result.ok) {
      toast.success("Login successful");
      router.replace(tenantHref("/customer/dashboard"));
    } else {
      setError(result.message);
      toast.error(result.message);
      setOtp("");
      verifyLock.current = false;
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpSent) {
      await handleSendOtp();
      return;
    }
    await runOtpVerify();
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(phone, password, orgSlug);
    setLoading(false);

    if (result.ok) {
      toast.success("Login successful");
      router.replace(tenantHref("/customer/dashboard"));
    } else {
      setError(result.message);
      toast.error(result.message);
    }
  }

  const businessName = branding?.businessName?.trim() || "Customer Portal";
  const logoUrl = branding?.businessLogo
    ? resolveUploadsPublicUrl(branding.businessLogo)
    : "/my-detail-os-mark.png";

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
        <div className="text-center mb-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            width={56}
            height={56}
            className="mb-4 size-14 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {businessName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Customer portal — sign in to view your vehicles and service history
          </p>
        </div>

        {/* Method Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200 text-sm font-semibold mb-6">
          <button
            type="button"
            onClick={() => switchMethod("otp")}
            className={cn(
              "py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5",
              loginMethod === "otp"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Smartphone className="size-4 text-teal-600" />
            Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => switchMethod("password")}
            className={cn(
              "py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5",
              loginMethod === "password"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <KeyRound className="size-4 text-teal-600" />
            Password
          </button>
        </div>

        {loginMethod === "otp" ? (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            {!otpSent ? (
              <>
                <div className="text-left">
                  <label
                    htmlFor="otp-phone"
                    className="mb-1.5 block text-sm font-medium text-slate-600"
                  >
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="flex h-[50px] shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                      +91
                    </div>
                    <input
                      id="otp-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      required
                      maxLength={10}
                      disabled={loading}
                      className="block w-full rounded-md border-2 border-slate-300 bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-0 disabled:opacity-50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || phone.length < 10}
                  className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP via WhatsApp"
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-4 text-teal-600" />
                    <span className="text-sm font-medium text-slate-800">+91 {phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setError(null);
                    }}
                    disabled={loading}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-x-3">
                    <span className="text-sm font-medium text-slate-600">Enter 6-digit OTP</span>
                    {resendCountdown > 0 ? (
                      <span className="text-xs font-medium text-slate-400">
                        Resend OTP in {resendCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSendOtp()}
                        disabled={loading}
                        className="inline-flex min-h-8 items-center text-sm font-semibold text-teal-700 hover:text-teal-600 disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <OtpInput
                    length={6}
                    value={otp}
                    onChange={setOtp}
                    onComplete={(v) => void runOtpVerify(v)}
                    disabled={loading}
                  />
                  {otpHint && (
                    <p className="text-center text-xs text-slate-500">{otpHint}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || otp.length < 4}
                  className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>
              </>
            )}

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="text-left">
              <label
                htmlFor="pwd-phone"
                className="mb-1.5 block text-sm font-medium text-slate-600"
              >
                Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="flex h-[50px] shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                  +91
                </div>
                <input
                  id="pwd-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                  maxLength={10}
                  disabled={loading}
                  className="block w-full rounded-md border-2 border-slate-300 bg-transparent px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-0 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="text-left">
              <FloatingField
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
                required
                disabled={loading}
                autoComplete="current-password"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-700"
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading || phone.length < 10 || !password}
              className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
