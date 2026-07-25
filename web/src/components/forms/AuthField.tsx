import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils/tailwindUtils";

type AuthFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  description?: string;
  error?: string;
  label: string;
};

const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ className, description, error, id, label, name, type, ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = React.useState(false);
    const inputId = id ?? name;
    const isPassword = type === "password";
    const descriptionId = description && !error ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-white/85">
          {label}
        </label>
        <div className="relative">
          <input
            {...props}
            ref={ref}
            id={inputId}
            name={name}
            type={isPassword && passwordVisible ? "text" : type}
            aria-describedby={errorId ?? descriptionId}
            aria-invalid={Boolean(error)}
            className={cn(
              "min-h-11 w-full rounded-lg border bg-black/35 px-3.5 py-2 font-sans text-base text-white outline-none transition-colors placeholder:text-white/55 hover:border-white/35 focus:border-white/65 focus:ring-2 focus:ring-white/20",
              isPassword && "pr-12",
              error ? "border-red-400/80" : "border-white/20",
              className,
            )}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-white/65 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
            >
              {passwordVisible ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        {error ? (
          <p id={errorId} className="mt-1.5 text-sm text-red-300">
            {error}
          </p>
        ) : description ? (
          <p id={descriptionId} className="mt-1 text-xs leading-4 text-white/60">
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);

AuthField.displayName = "AuthField";

export { AuthField };
