import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "@tanstack/react-router";
import { AlertCircle, LoaderCircle } from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { AuthField } from "@/components/forms/AuthField";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(1, "Username is required")
      .min(3, "Username must be at least 3 characters")
      .trim(),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  next?: string | null;
}

export function RegisterForm({ next }: RegisterFormProps) {
  const { register: registerUser, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(
        data.username,
        data.email,
        data.password,
        next ?? undefined,
      );
    } catch {
      // The auth store exposes the actionable error above the form.
    }
  };

  return (
    <div>
      <h1 className="text-balance text-center font-mono text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
        Create your account
      </h1>
      <p className="mt-1 text-center text-sm leading-5 text-white/65">
        Start tracking what you love in a few seconds.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-3 flex gap-3 rounded-lg bg-red-500/12 p-2.5 text-sm leading-5 text-red-200 ring-1 ring-inset ring-red-400/35"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form
        noValidate
        aria-busy={isLoading}
        onSubmit={handleSubmit(onSubmit)}
        className="mt-5 lg:mt-7"
      >
        <div className="space-y-3 lg:space-y-4">
          <AuthField
            label="Username"
            type="text"
            autoComplete="username"
            placeholder="Choose a username"
            error={errors.username?.message}
            {...register("username")}
          />

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
            autoComplete="new-password"
            placeholder="Create a password"
            description="Use at least 8 characters."
            error={errors.password?.message}
            {...register("password")}
          />

          <AuthField
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        <Button
          type="submit"
          className="mt-5 w-full rounded-lg lg:mt-7"
          disabled={isLoading}
        >
          {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          {isLoading ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-white/65 lg:mt-7">
        Already have an account?{" "}
        <Link
          to="/login"
          search={next ? { next } : {}}
          className="font-medium text-white underline decoration-white/35 underline-offset-4 hover:decoration-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
