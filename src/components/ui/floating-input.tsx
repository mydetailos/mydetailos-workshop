"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, type, label, id, placeholder, ...props }, ref) => {
    const inputId = id || `floating-input-${label.replace(/\s+/g, "-").toLowerCase()}`;
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = React.useState(false);
    const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="relative w-full pt-2">
        <input
          type={resolvedType}
          id={inputId}
          ref={ref}
          placeholder={placeholder || " "}
          className={cn(
            "peer block h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 text-base text-slate-900 placeholder:text-transparent transition-colors sm:h-12 sm:text-sm",
            "focus:border-teal-600 focus:placeholder:text-slate-400 focus:outline-none focus:ring-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isPassword && "pr-11",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-3 top-2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 transition-all duration-200 peer-placeholder-shown:top-[calc(50%+0.25rem)] peer-placeholder-shown:text-[15px] peer-focus:top-2 peer-focus:text-sm peer-focus:text-teal-600"
        >
          {label}
        </label>
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-[calc(50%+0.25rem)] flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
