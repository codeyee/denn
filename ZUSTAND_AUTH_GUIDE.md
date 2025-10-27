# Zustand Authentication Setup

This guide explains how to use Zustand for authentication in your Next.js app.

## Files Created

### 1. Auth Store (`app/_stores/auth-store.ts`)
The main Zustand store that manages authentication state:
- User information
- Authentication token
- Loading states
- Error handling
- Login/Register/Logout actions

Features:
- ✅ Persists auth state to localStorage
- ✅ Automatic token management
- ✅ Error handling
- ✅ Loading states

### 2. Store Provider (`app/_providers/StoreProvider.tsx`)
Wrapper component for Next.js App Router compatibility.

### 3. useAuth Hook (`app/_hooks/useAuth.ts`)
Custom hook that provides a convenient interface for auth operations:
- `login(email, password)` - Authenticate user
- `register(username, email, password)` - Register new user
- `logout()` - Clear user session
- `user` - Current user data
- `token` - Auth token
- `isAuthenticated` - Boolean auth status
- `isLoading` - Loading state
- `error` - Error messages

### 4. Components
- **Login Form** (`app/_components/Login/index.tsx`)
- **Register Form** (Updated: `app/_components/Register/index.tsx`)
- **Protected Route** (`app/_components/ProtectedRoute/index.tsx`)

## Usage Examples

### 1. Using the Auth Hook in Components

```tsx
"use client";
import { useAuth } from "@/app/_hooks/useAuth";

export default function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.username}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Protecting Routes

Wrap your page content with `ProtectedRoute`:

```tsx
import { ProtectedRoute } from "@/app/_components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected dashboard content</div>
    </ProtectedRoute>
  );
}
```

### 3. Accessing Auth State Directly

```tsx
import { useAuthStore } from "@/app/_stores/auth-store";

export default function SomeComponent() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Use the token for API calls
  // ...
}
```

### 4. Making Authenticated API Calls

```tsx
import { useAuthStore } from "@/app/_stores/auth-store";

async function fetchUserData() {
  const token = useAuthStore.getState().token;
  
  const response = await fetch("http://localhost:8000/api/user/profile/", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  
  return response.json();
}
```

## Configuration

### API Endpoints
Update the API endpoints in `app/_stores/auth-store.ts`:

```typescript
// Change these to match your backend
const API_URL = "http://localhost:8000/api/auth";

// In the login function:
fetch(`${API_URL}/login/`, { /* ... */ });

// In the register function:
fetch(`${API_URL}/register/`, { /* ... */ });
```

### Redirect Paths
Customize redirect paths in `app/_hooks/useAuth.ts`:

```typescript
router.push("/dashboard"); // After login
router.push("/login"); // After logout
```

### Storage Configuration
The auth state is persisted to localStorage. You can customize this in `auth-store.ts`:

```typescript
{
  name: 'auth-storage', // localStorage key
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    // Only these fields are persisted
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
  }),
}
```

## Integration with Your Backend

The current setup expects your backend API to return:

```json
{
  "user": {
    "id": "123",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "token": "your-auth-token"
}
```

Adjust the response handling in `auth-store.ts` if your API returns different data.

## Next Steps

1. **Create login/register pages** if they don't exist
2. **Update API endpoints** to match your Django backend
3. **Add middleware** for automatic token refresh (optional)
4. **Add error boundaries** for better error handling
5. **Implement remember me** functionality (optional)

## Best Practices

- ✅ Always use the `useAuth` hook instead of accessing the store directly
- ✅ Wrap protected pages with `ProtectedRoute`
- ✅ Clear sensitive data on logout
- ✅ Handle token expiration
- ✅ Use TypeScript for type safety
- ✅ Keep auth logic centralized in the store

## Troubleshooting

### Hydration Errors
If you see hydration errors, make sure:
- The `StoreProvider` is in your root layout
- You're using `"use client"` directive in components that use the store
- You're not accessing localStorage during SSR

### Token Not Persisting
Check:
- localStorage is available in the browser
- The `persist` middleware is properly configured
- Browser doesn't block localStorage

### Authentication Not Working
Verify:
- API endpoints are correct
- CORS is configured on your backend
- Response format matches expected structure
- Token is being sent with requests
