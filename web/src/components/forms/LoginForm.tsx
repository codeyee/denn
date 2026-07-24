import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/common/ui/Button";
import { Card } from "@/components/common/ui/Card";
import { Input } from "@/components/common/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";

// Define validation schema
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
    // Clear any previous errors when component mounts
    return () => {
      clearError();
    };
  }, [clearError]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, next ?? undefined);
      // Redirect is handled in useAuth hook
    } catch (err) {
      // Error is already set in the store
      console.error("Login failed:", err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
      
      {error && (
        <div role="alert" className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button 
          type="submit" 
          className="w-full cursor-pointer mt-4"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm font-sans">
        <span className="text-gray-600 dark:text-gray-400">
          Don&apos;t have an account?{" "}
        </span>
        <Link
          to="/register"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Sign up
        </Link>
      </div>
    </Card>
  );
}
