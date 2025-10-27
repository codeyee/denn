# Authentication Usage Examples

This file contains practical examples of how to use the Zustand authentication system in your Next.js app.

## Table of Contents
1. [Basic Authentication](#basic-authentication)
2. [Form Components](#form-components)
3. [Protected Routes](#protected-routes)
4. [API Requests](#api-requests)
5. [Navigation Guards](#navigation-guards)
6. [Conditional Rendering](#conditional-rendering)

---

## 1. Basic Authentication

### Login Component
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";
import { useState } from "react";

export default function LoginExample() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Will redirect automatically on success
    } catch (err) {
      console.error("Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      
      <input 
        type="password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      
      <button disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```

### Register Component
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";

export default function RegisterExample() {
  const { register, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      await register(
        formData.get("username") as string,
        formData.get("email") as string,
        formData.get("password") as string
      );
    } catch (err) {
      console.error("Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}
      <input name="username" required />
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button disabled={isLoading}>Register</button>
    </form>
  );
}
```

### Logout Button
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button onClick={logout}>
      Logout
    </button>
  );
}
```

---

## 2. Form Components

### Using React Hook Form (Recommended)
```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/app/_hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginWithValidation() {
  const { login, isLoading } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    await login(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <button disabled={isLoading}>Login</button>
    </form>
  );
}
```

---

## 3. Protected Routes

### Page-Level Protection
```tsx
import { ProtectedRoute } from "@/app/_components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <h1>Dashboard</h1>
      <p>This content is only visible to authenticated users</p>
    </ProtectedRoute>
  );
}
```

### Custom Protection with Redirect
```tsx
import { ProtectedRoute } from "@/app/_components/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute redirectTo="/login">
      <h1>Admin Panel</h1>
    </ProtectedRoute>
  );
}
```

### Layout-Level Protection
```tsx
// app/dashboard/layout.tsx
import { ProtectedRoute } from "@/app/_components/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="dashboard-layout">
        <nav>Dashboard Navigation</nav>
        {children}
      </div>
    </ProtectedRoute>
  );
}
```

---

## 4. API Requests

### Using the API Helper
```tsx
import { api } from "@/lib/api";

// Public endpoint
const publicData = await api.get("/public/items");

// Authenticated GET request
const userData = await api.get("/user/profile", true);

// Authenticated POST request
const newList = await api.post(
  "/lists", 
  { name: "My List", description: "A new list" },
  true
);

// Authenticated PUT request
await api.put("/lists/123", { name: "Updated Name" }, true);

// Authenticated DELETE request
await api.delete("/lists/123", true);
```

### Using the useApi Hook
```tsx
"use client";
import { useApi } from "@/app/_hooks/useApi";

export default function UserProfile() {
  const { data, isLoading, error, get } = useApi<{ username: string; email: string }>(
    "/user/profile",
    { 
      requiresAuth: true,
      onSuccess: (data) => console.log("Profile loaded", data),
      onError: (error) => console.error("Failed to load profile", error)
    }
  );

  useEffect(() => {
    get();
  }, [get]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.username}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

### Manual Fetch with Token
```tsx
"use client";
import { useAuthStore } from "@/app/_stores/auth-store";

export default function ManualFetch() {
  const token = useAuthStore((state) => state.token);

  const fetchData = async () => {
    const response = await fetch("http://localhost:8000/api/data", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  };

  return <button onClick={fetchData}>Fetch Data</button>;
}
```

### React Query Integration
```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function UserLists() {
  const { data, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: () => api.get("/lists", true),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {data?.map((list: any) => (
        <li key={list.id}>{list.name}</li>
      ))}
    </ul>
  );
}
```

---

## 5. Navigation Guards

### Redirect If Authenticated
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return <LoginForm />;
}
```

### Role-Based Access
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user?.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [isAuthenticated, user, router]);

  if (!user || user.role !== "admin") {
    return null;
  }

  return <AdminDashboard />;
}
```

---

## 6. Conditional Rendering

### Show/Hide Based on Auth
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";

export default function Navigation() {
  const { isAuthenticated, user } = useAuth();

  return (
    <nav>
      <Link href="/">Home</Link>
      
      {isAuthenticated ? (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/profile">Profile</Link>
          <span>Welcome, {user?.username}</span>
          <LogoutButton />
        </>
      ) : (
        <>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
```

### User Avatar Component
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";

export default function UserAvatar() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <div>Guest</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <img 
        src={user.avatar || "/default-avatar.png"} 
        alt={user.username}
        className="w-8 h-8 rounded-full"
      />
      <span>{user.username}</span>
    </div>
  );
}
```

### Loading State
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";

export default function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  return <AppContent />;
}
```

---

## 7. Advanced Patterns

### Middleware Pattern
```tsx
// app/_middleware/withAuth.tsx
import { useAuth } from "@/app/_hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push("/login");
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !isAuthenticated) {
      return <div>Loading...</div>;
    }

    return <Component {...props} />;
  };
}

// Usage
const ProtectedPage = withAuth(function Page() {
  return <div>Protected Content</div>;
});
```

### Context Provider Pattern
```tsx
// app/_contexts/AuthContext.tsx
"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useAuthStore } from "@/app/_stores/auth-store";

const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthStore();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
```

### Error Boundary with Auth
```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";
import { useEffect } from "react";

export default function ErrorBoundary({ error }: { error: Error }) {
  const { logout } = useAuth();

  useEffect(() => {
    // If authentication error, logout user
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      logout();
    }
  }, [error, logout]);

  return <div>Error: {error.message}</div>;
}
```

---

## Tips & Best Practices

1. **Always use the `useAuth` hook** instead of accessing the store directly
2. **Handle errors gracefully** - the hook provides error messages
3. **Check loading states** before rendering content
4. **Clear errors** when unmounting components with `clearError()`
5. **Use TypeScript** for type safety with User and Auth types
6. **Implement token refresh** for long-running sessions
7. **Test authentication flows** thoroughly

---

## Common Patterns Summary

| Pattern | Use Case | Example |
|---------|----------|---------|
| `useAuth()` | Most common, hook-based | Login/Register forms |
| `ProtectedRoute` | Page protection | Dashboard, Profile pages |
| `api.get/post()` | API requests | Fetching data |
| `useApi()` | React-style API calls | Components with loading states |
| `useAuthStore()` | Direct store access | Advanced use cases |
| `withAuth()` | HOC pattern | Wrapping components |

---

For more information, see:
- `ZUSTAND_SETUP_COMPLETE.md` - Quick start guide
- `ZUSTAND_AUTH_GUIDE.md` - Detailed documentation
