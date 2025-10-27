# Zustand Authentication Setup - Quick Start

## 🎉 What's Been Set Up

Your Next.js app now has a complete Zustand authentication system with:

- ✅ **Auth Store** - Centralized state management with persistence
- ✅ **Login & Register Forms** - Ready-to-use components
- ✅ **Protected Routes** - Route protection wrapper
- ✅ **Auth Hook** - Convenient `useAuth()` hook
- ✅ **API Utilities** - Helper for authenticated requests
- ✅ **TypeScript Support** - Fully typed

## 📁 Files Created

```
app/
├── _stores/
│   └── auth-store.ts              # Main Zustand auth store
├── _providers/
│   └── StoreProvider.tsx          # Next.js compatibility wrapper
├── _hooks/
│   └── useAuth.ts                 # Custom auth hook
├── _components/
│   ├── Login/
│   │   └── index.tsx             # Login form component
│   ├── Register/
│   │   └── index.tsx             # Register form (updated)
│   └── ProtectedRoute/
│       └── index.tsx             # Route protection component
├── login/
│   └── page.tsx                  # Login page
└── profile/
    └── page.tsx                  # Example protected page

lib/
└── api.ts                        # API utility helpers

.env.local.example                # Environment variables template
ZUSTAND_AUTH_GUIDE.md            # Detailed documentation
```

## 🚀 Quick Usage

### 1. Use the Auth Hook

```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";

export default function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.username}!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

### 2. Protect Routes

```tsx
import { ProtectedRoute } from "@/app/_components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected content here</div>
    </ProtectedRoute>
  );
}
```

### 3. Make Authenticated API Calls

```tsx
import { api } from "@/lib/api";

// Without auth
const data = await api.get("/public/data");

// With auth
const userData = await api.get("/user/profile", true);

// POST with auth
await api.post("/lists", { name: "My List" }, true);
```

## ⚙️ Configuration

### 1. Set Up Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 2. Update API Endpoints (if needed)

In `app/_stores/auth-store.ts`, update:

```typescript
// Line 52 - Login endpoint
fetch('http://localhost:8000/api/auth/login/', { /* ... */ })

// Line 77 - Register endpoint
fetch('http://localhost:8000/api/auth/register/', { /* ... */ })
```

### 3. Adjust API Response Format (if needed)

The store expects this response format:

```json
{
  "user": {
    "id": "123",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "token": "your-jwt-token"
}
```

If your API returns different data, update the response handling in `auth-store.ts`.

## 🔗 Integration with Your Django Backend

Based on your Django setup, update these endpoints:

```typescript
// In auth-store.ts
const API_BASE = 'http://localhost:8000/api/authentication';

// Login
fetch(`${API_BASE}/login/`, { /* ... */ })

// Register  
fetch(`${API_BASE}/register/`, { /* ... */ })
```

Make sure your Django views return:
- User object with `id`, `username`, `email`
- Authentication token (JWT or similar)

## 📝 Available Pages

- `/login` - Login page
- `/register` - Registration page (already exists)
- `/profile` - Example protected profile page

## 🎯 Common Tasks

### Get Current User

```tsx
const { user } = useAuth();
console.log(user?.username);
```

### Check Authentication Status

```tsx
const { isAuthenticated } = useAuth();
if (isAuthenticated) {
  // User is logged in
}
```

### Handle Loading States

```tsx
const { isLoading } = useAuth();
return isLoading ? <Spinner /> : <Content />;
```

### Display Errors

```tsx
const { error } = useAuth();
{error && <div className="error">{error}</div>}
```

### Access Token for API Calls

```tsx
import { useAuthStore } from "@/app/_stores/auth-store";

const token = useAuthStore((state) => state.token);
// Use token in fetch headers
```

## 🔒 Security Best Practices

1. **Never expose tokens** in console logs in production
2. **Use HTTPS** in production
3. **Implement token refresh** for long sessions
4. **Clear storage on logout** (already implemented)
5. **Validate tokens** on the backend
6. **Set appropriate CORS** headers in Django

## 🐛 Troubleshooting

### "Hydration Error"
- Make sure `"use client"` is at the top of components using auth
- `StoreProvider` is already added to your layout

### "401 Unauthorized"
- Check API endpoint URLs
- Verify token format matches backend expectations
- Enable CORS in Django settings

### Token Not Persisting
- Check browser localStorage is enabled
- Verify the persist middleware is configured

## 🎨 Customization

### Change Redirect Routes

In `app/_hooks/useAuth.ts`:

```typescript
router.push("/dashboard"); // After login
router.push("/"); // After logout
```

### Customize Storage Key

In `auth-store.ts`:

```typescript
{
  name: 'my-custom-auth-key', // localStorage key
  // ...
}
```

### Add More User Fields

Update the `User` interface in `auth-store.ts`:

```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  // Add more fields
}
```

## 📚 Next Steps

1. ✅ Test login/register with your Django backend
2. ⬜ Add token refresh functionality
3. ⬜ Implement "Remember Me" feature
4. ⬜ Add password reset flow
5. ⬜ Create more protected pages
6. ⬜ Add user profile editing
7. ⬜ Implement role-based access control

## 📖 Full Documentation

See `ZUSTAND_AUTH_GUIDE.md` for detailed documentation and advanced usage.

## 💡 Example: Complete Login Flow

```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    await login(email, password);
  };

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="error">{error}</div>}
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button disabled={isLoading}>
        {isLoading ? "Loading..." : "Login"}
      </button>
    </form>
  );
}
```

---

**Ready to go!** 🚀 Your authentication system is set up and ready to use.
