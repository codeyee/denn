import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "@tanstack/react-router";
import { AlertCircle, LoaderCircle } from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { AuthField } from "@/components/forms/AuthField";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  next?: string | null;
}

export function LoginForm({ next }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, next ?? undefined);
    } catch {
      // The auth store exposes the actionable error above the form.
    }
  };

  return (
    <div>
      <h1 className="text-balance text-center font-mono text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
        Sign in to Denn
      </h1>
      <p className="mt-1.5 text-center text-sm leading-5 text-white/65">
        Continue building your personal collection.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 flex gap-3 rounded-lg bg-red-500/12 p-3 text-sm leading-5 text-red-200 ring-1 ring-inset ring-red-400/35"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form
        noValidate
        aria-busy={isLoading}
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 lg:mt-8"
      >
        <div className="space-y-4 lg:space-y-5">
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <Button
          type="submit"
          className="mt-6 w-full rounded-lg lg:mt-8"
          disabled={isLoading}
        >
          {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          {isLoading ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/65 lg:mt-8">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          search={next ? { next } : {}}
          className="font-medium text-white underline decoration-white/35 underline-offset-4 hover:decoration-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
