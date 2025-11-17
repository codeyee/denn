# Architecture Recommendations - DENN Project

> **Document Version:** 1.0
> **Date:** 2025-11-15
> **Purpose:** Technical recommendations for production-grade architecture
> **⚠️ IMPLEMENTATION TIMING:** POST-MVP (After Friends & Family Launch)
> **Priority:** Apply these improvements AFTER gathering user feedback from MVP release

---

## Table of Contents

1. [State Management Migration](#1-state-management-migration)
2. [Component Architecture Improvements](#2-component-architecture-improvements)
3. [Performance Optimization Strategy](#3-performance-optimization-strategy)
4. [Error Handling & Resilience](#4-error-handling--resilience)
5. [Testing Strategy](#5-testing-strategy)
6. [Production Deployment](#6-production-deployment)
7. [Monitoring & Observability](#7-monitoring--observability)

---

## 1. State Management Migration

### Current Issues

**Problem:** Zustand stores mix state management with data fetching
- `lists-store.ts` (352 lines) - Too much logic
- `auth-store.ts` (201 lines) - Duplicates API logic
- No automatic caching, refetching, or deduplication
- Manual loading/error state management

**Example of current pattern:**
```typescript
// ❌ Current: Store does everything
export const useListsStore = create<ListsStore>((set, get) => ({
  lists: [],
  isLoading: false,
  error: null,

  fetchLists: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await listActions.list();
      set({ lists: response.results, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
```

### Recommended Solution: Hybrid Architecture

**Use SWR/React Query for server state + Zustand for UI state**

#### Install Dependencies
```bash
npm install swr
# or
npm install @tanstack/react-query
```

#### New Architecture

**Server State (SWR):**
```typescript
// lib/hooks/useLists.ts
import useSWR from 'swr';
import { listActions } from '@/lib/api';

export function useLists(options?: { items_size?: number }) {
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/lists/', options],
    ([_, opts]) => listActions.list(opts),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    lists: data?.results || [],
    isLoading,
    error,
    refetch: mutate,
  };
}
```

**UI State (Zustand):**
```typescript
// app/_stores/ui-store.ts
import { create } from 'zustand';

interface UIState {
  // Only UI-specific state
  isEditListModalOpen: boolean;
  isAddToListModalOpen: boolean;
  activeListId: number | null;
  viewMode: 'list' | 'gallery';
}

interface UIActions {
  openEditListModal: (listId: number) => void;
  closeEditListModal: () => void;
  setViewMode: (mode: 'list' | 'gallery') => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  isEditListModalOpen: false,
  isAddToListModalOpen: false,
  activeListId: null,
  viewMode: 'list',

  openEditListModal: (listId) => set({ isEditListModalOpen: true, activeListId: listId }),
  closeEditListModal: () => set({ isEditListModalOpen: false, activeListId: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
```

**Component Usage:**
```typescript
// ✅ New pattern: Clean separation
import { useLists } from '@/lib/hooks/useLists';
import { useUIStore } from '@/app/_stores/ui-store';

export function HomePage() {
  const { lists, isLoading, error } = useLists({ items_size: 6 });
  const { viewMode, setViewMode } = useUIStore();

  // No manual loading/error management needed!
}
```

### Benefits

- ✅ Automatic caching (no duplicate requests)
- ✅ Automatic refetching on window focus
- ✅ Request deduplication
- ✅ Optimistic updates built-in
- ✅ Smaller, focused stores
- ✅ Better TypeScript inference
- ✅ DevTools for debugging (SWR DevTools)

### Migration Plan

**Phase 1:** (1 week)
- [ ] Install SWR
- [ ] Create `lib/hooks/` directory
- [ ] Migrate `useLists` hook
- [ ] Update HomePage to use new hook
- [ ] Verify no regressions

**Phase 2:** (1 week)
- [ ] Migrate list items fetching
- [ ] Migrate content fetching
- [ ] Migrate search functionality

**Phase 3:** (1 week)
- [ ] Migrate auth (keep in Zustand but simplify)
- [ ] Remove old fetch methods from stores
- [ ] Update all components

---

## 2. Component Architecture Improvements

### Component Size Refactoring Priority

**Immediate (Sprint 1):**

1. **ListSidebar.tsx** (334 lines → target: <150)
   ```
   app/_components/pages/ListDetailPage/components/ListSidebar/
   ├── index.tsx              (~120 lines) - Container
   ├── ListStats.tsx          (~60 lines)
   ├── ListFilters.tsx        (~80 lines)
   ├── ListMembers.tsx        (~70 lines)
   └── ListActions.tsx        (~50 lines)
   ```

2. **DomeGallery** (286 lines → target: <150)
   ```
   app/_components/pages/LandingPage/components/DomeGallery/
   ├── index.tsx              (~100 lines) - Container
   ├── components/
   │   ├── DomeTile.tsx      (~80 lines) - Individual tile
   │   └── DomeModal.tsx     (~60 lines) - Modal view
   └── DomeGallery.module.css - Replace inline styles
   ```

3. **useDomeImageModal** (341 lines → target: <100 per hook)
   ```
   hooks/
   ├── useDomeImageState.ts   (~80 lines) - State management
   ├── useDomeImageGestures.ts (~120 lines) - Gesture handling
   └── useDomeImageAnimation.ts (~90 lines) - GSAP animations
   ```

### Extract Common Patterns

**Loading State Component:**
```typescript
// app/_components/common/state/LoadingState.tsx
interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  className = "min-h-[400px]"
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
}

// Usage:
<LoadingState message="Loading your lists..." />
```

**Error State Component:**
```typescript
// app/_components/common/state/ErrorState.tsx
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  onGoBack?: () => void;
}

export function ErrorState({ error, onRetry, onGoBack }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <p className="text-red-400 text-xl mb-4">Error</p>
        <p className="text-gray-400 mb-6">{error}</p>
        <div className="flex gap-4 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          )}
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="px-6 py-2 border border-white/20 text-white rounded hover:bg-white/10"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Empty State Component:**
```typescript
// app/_components/common/state/EmptyState.tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      {description && <p className="text-gray-400 mb-6 max-w-md">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Usage:
<EmptyState
  title="No lists found"
  description="Create your first list to get started"
  icon={<Package size={48} />}
  action={{
    label: "Create List",
    onClick: openCreateListModal
  }}
/>
```

---

## 3. Performance Optimization Strategy

### Memoization Strategy

**Rule of Thumb:**
- Use `React.memo` for components rendered in lists/loops
- Use `useMemo` for expensive computations (>10ms)
- Use `useCallback` for functions passed as props

**Priority List:**

1. **Card Components** (rendered in carousels)
   ```typescript
   // app/_components/common/cards/Card/index.tsx
   export const Card = React.memo(function Card({
     title,
     image,
     onClick,
     metadata
   }: CardProps) {
     // Component implementation
   }, (prevProps, nextProps) => {
     // Custom comparison for deep equality if needed
     return prevProps.id === nextProps.id &&
            prevProps.image === nextProps.image;
   });
   ```

2. **List Item Components**
   ```typescript
   export const ListItem = React.memo(function ListItem(props: ListItemProps) {
     const handleClick = useCallback(() => {
       props.onClick(props.item.id);
     }, [props.onClick, props.item.id]);

     return <div onClick={handleClick}>...</div>;
   });
   ```

3. **Expensive Computations**
   ```typescript
   const groupedItems = useMemo(() => {
     return groupItemsByStatus(items); // Expensive operation
   }, [items]); // Only recompute when items change
   ```

### Image Optimization

**Current Issue:** Using `unoptimized` prop defeats Next.js Image optimization

**Fix:**
```typescript
// ❌ Before:
<Image
  src={it.src}
  alt={it.alt}
  fill
  unoptimized  // Bad!
/>

// ✅ After:
<Image
  src={it.src}
  alt={it.alt}
  width={400}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..." // Generate blur hash
/>
```

### Code Splitting

**Lazy load heavy components:**
```typescript
import dynamic from 'next/dynamic';

const HeavyModal = dynamic(
  () => import('@/app/_components/common/modals/HeavyModal'),
  {
    loading: () => <LoadingState message="Loading..." />,
    ssr: false, // Don't render on server if not needed
  }
);
```

**Route-based code splitting** (automatic with Next.js App Router)

### Virtual Scrolling

**For lists with 500+ items:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualList({ items }: { items: ListItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ListItem item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Error Handling & Resilience

### Error Boundary Strategy

**Create route-level error boundaries:**

```typescript
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/app/_components/common/state/ErrorState';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error tracking service
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background-logged-in">
      <ErrorState
        error={error.message || 'Something went wrong'}
        onRetry={reset}
      />
    </div>
  );
}
```

**Create component-level error boundaries:**
```typescript
// app/_components/common/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorState error={this.state.error?.message || 'Component error'} />
      );
    }

    return this.props.children;
  }
}

// Usage:
<ErrorBoundary fallback={<div>Error loading gallery</div>}>
  <DomeGallery />
</ErrorBoundary>
```

### API Error Handling

**Create typed error classes:**
```typescript
// lib/errors/ApiError.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, data: unknown): ApiError {
    return new ApiError(
      response.status,
      typeof data === 'object' && data !== null && 'detail' in data
        ? String(data.detail)
        : 'Request failed',
      data
    );
  }

  get isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

// Usage in API client:
if (!response.ok) {
  const data = await response.json().catch(() => ({}));
  throw ApiError.fromResponse(response, data);
}
```

**Global error handler:**
```typescript
// app/_components/providers/ErrorProvider.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Toast } from '@/app/_components/common/Toast';

interface ErrorContextValue {
  showError: (message: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000); // Auto-clear after 5s
  };

  const clearError = () => setError(null);

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      {error && (
        <Toast type="error" message={error} onClose={clearError} />
      )}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
}
```

---

## 5. Testing Strategy

### Test Pyramid

```
       /\
      /  \  E2E (5%)
     /____\
    /      \  Integration (15%)
   /________\
  /          \  Unit (80%)
 /____________\
```

### Phase 1: Unit Tests (Critical Path)

**Priority functions to test:**
```typescript
// lib/utils/navigationUtils.test.ts
import { describe, it, expect } from 'vitest';
import { buildContentUrl } from './navigationUtils';

describe('buildContentUrl', () => {
  it('builds URL for movie', () => {
    const url = buildContentUrl({
      contentType: 'MOVIE',
      externalId: '123',
      sourceApi: 'TMDB'
    });
    expect(url).toBe('/content?type=MOVIE&external_id=123&source_api=TMDB');
  });

  it('handles missing parameters', () => {
    const url = buildContentUrl({});
    expect(url).toBe('/content');
  });
});
```

**Test coverage targets:**
- Utility functions: 100%
- Custom hooks: 80%
- Components: 60%
- E2E: Critical user flows

### Phase 2: Component Tests

```typescript
// app/_components/common/cards/Card/Card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './index';

describe('Card', () => {
  it('renders title and image', () => {
    render(<Card title="Test" image="/test.jpg" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Card title="Test" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Phase 3: E2E Tests (Playwright)

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Welcome')).toBeVisible();
});

test('user can create a list', async ({ page }) => {
  // Login first
  await page.goto('/');

  await page.click('button:has-text("Create List")');
  await page.fill('input[name="name"]', 'My Test List');
  await page.fill('textarea[name="description"]', 'Test description');
  await page.click('button:has-text("Create")');

  await expect(page.locator('text=My Test List')).toBeVisible();
});
```

### Setup Testing Framework

```bash
# Install Vitest
npm install -D vitest @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/jest-dom

# Install Playwright
npm install -D @playwright/test
npx playwright install
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

---

## 6. Production Deployment

### Pre-Deployment Checklist

**Security:**
- [ ] All environment variables documented
- [ ] No secrets in code
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (backend)
- [ ] CSP headers configured

**Performance:**
- [ ] Bundle size analyzed (`npm run build` → check .next/analyze)
- [ ] Images optimized
- [ ] Lazy loading implemented
- [ ] CDN configured for static assets
- [ ] Database queries optimized (backend)

**Monitoring:**
- [ ] Error tracking enabled (Sentry)
- [ ] Analytics configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured

**Quality:**
- [ ] Lighthouse score >90
- [ ] All critical tests passing
- [ ] No console errors in production
- [ ] Accessibility audit passed

### Environment-Specific Configs

**Development (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NODE_ENV=development
```

**Production (.env.production):**
```bash
NEXT_PUBLIC_API_URL=https://denn.up.railway.app/api
NODE_ENV=production
```

### Build Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable SWC minification (faster than Terser)
  swcMinify: true,

  // Analyze bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

---

## 7. Monitoring & Observability

### Error Tracking (Sentry)

```typescript
// lib/utils/sentry.ts
import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1, // 10% of transactions
      beforeSend(event, hint) {
        // Filter out non-critical errors
        if (hint.originalException instanceof ApiError) {
          const error = hint.originalException as ApiError;
          if (error.statusCode === 404) {
            return null; // Don't report 404s
          }
        }
        return event;
      },
    });
  }
}

// Replace console.error with:
export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      tags: context,
      extra: { message },
    });
  } else {
    console.error(`[${message}]`, error, context);
  }
}
```

### Performance Monitoring

```typescript
// lib/utils/performance.ts
export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;

  if (duration > 100) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
  }

  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'timing_complete', {
      name,
      value: Math.round(duration),
      event_category: 'Performance',
    });
  }
}

// Usage:
measurePerformance('groupItems', () => {
  const grouped = groupItemsByStatus(items);
});
```

### Analytics Events

```typescript
// lib/utils/analytics.ts
export const analytics = {
  trackEvent(name: string, properties?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', name, properties);
    }
  },

  trackPageView(url: string) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
      });
    }
  },
};

// Usage:
analytics.trackEvent('list_created', {
  list_name: listName,
  list_type: listType,
});
```

---

## Implementation Roadmap

### Sprint 1: Security & Stability (Week 1-2)
- [ ] Fix all critical security vulnerabilities
- [ ] Add error boundaries
- [ ] Implement error tracking
- [ ] Add loading states

### Sprint 2: Architecture (Week 3-4)
- [ ] Migrate to SWR for data fetching
- [ ] Refactor oversized components
- [ ] Extract common components
- [ ] Add TypeScript strict checks

### Sprint 3: Performance (Week 5-6)
- [ ] Add React.memo to cards
- [ ] Implement virtual scrolling
- [ ] Optimize images
- [ ] Code splitting

### Sprint 4: Testing (Week 7-8)
- [ ] Set up testing framework
- [ ] Write unit tests (80% coverage)
- [ ] Write component tests (60% coverage)
- [ ] E2E tests for critical paths

### Sprint 5: Polish & Deploy (Week 9-10)
- [ ] Accessibility audit
- [ ] Performance audit (Lighthouse >90)
- [ ] Documentation
- [ ] Production deployment

---

**Document Maintained By:** DENN Architecture Team
**Last Updated:** 2025-11-15
**Next Review:** After Sprint 1 completion
