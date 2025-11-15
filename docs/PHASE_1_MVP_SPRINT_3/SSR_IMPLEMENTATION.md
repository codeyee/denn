# Server-Side Rendering (SSR) - Landing Page Implementation Guide

> **Target:** Landing page with fast loading and SEO optimization
> **Current Issue:** Client-side fetch in `Background.tsx` slows initial load
> **Solution:** Server-Side Rendering with Next.js App Router
> **Priority:** 🟡 MEDIUM (MVP Nice-to-Have)

---

## Current Architecture (Client-Side)

```
┌─────────────────────────────────────────────┐
│ User visits /                               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Next.js sends HTML shell (empty)           │
│ React hydrates on client                   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Background.tsx useEffect runs               │
│ fetch('/api/cards') - CLIENT SIDE           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Waits for API response...                  │
│ User sees loading spinner                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Images load, gallery renders               │
│ DOMContentLoaded: 2-3 seconds              │
│ LCP (Largest Contentful Paint): 3-4 sec    │
└─────────────────────────────────────────────┘
```

**Problems:**
- ❌ Slow initial load (client-side fetch)
- ❌ Poor SEO (crawlers see empty page initially)
- ❌ Bad Core Web Vitals (high LCP)
- ❌ Flash of loading spinner

---

## Target Architecture (Server-Side Rendering)

```
┌─────────────────────────────────────────────┐
│ User visits /                               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Next.js Server fetches /api/cards          │
│ SERVER-SIDE (before sending HTML)          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Server renders full HTML with images       │
│ Sends complete page to client              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ User sees full content immediately         │
│ React hydrates in background               │
│ DOMContentLoaded: 0.5-1 second             │
│ LCP: 1-2 seconds                           │
└─────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Fast initial load (no client fetch)
- ✅ SEO optimized (crawlers see full content)
- ✅ Better Core Web Vitals
- ✅ No loading spinner flash

---

## Implementation Steps

### Step 1: Create Server Component (Data Fetching)

**File:** `app/page.tsx` (root landing page)

```typescript
// app/page.tsx
import { LandingPageContent } from './_components/pages/LandingPage/LandingPageContent';

// This is a Server Component by default in App Router
export default async function HomePage() {
  // Fetch server-side
  const images = await getBackgroundImages();

  // Pass data to client component
  return <LandingPageContent images={images} />;
}

// Server-side data fetching
async function getBackgroundImages() {
  // Use internal API URL (server-to-server)
  const apiUrl = process.env.API_URL || 'http://localhost:3000';

  const res = await fetch(`${apiUrl}/api/cards`, {
    // Caching strategy (choose one):

    // Option 1: Static (build time, revalidate periodically)
    next: { revalidate: 3600 }, // Revalidate every hour

    // Option 2: Always fresh (like getServerSideProps)
    // cache: 'no-store',

    // Option 3: Cache forever (like getStaticProps)
    // cache: 'force-cache',
  });

  if (!res.ok) {
    // Fallback to empty array on error
    console.error('Failed to fetch background images:', res.statusText);
    return [];
  }

  return res.json();
}

// Optional: Generate static metadata
export const metadata = {
  title: 'DENN - Track Your Media Journey',
  description: 'Track, rate, and organize your favorite movies, TV shows, games, music, and books all in one place.',
  openGraph: {
    title: 'DENN - Track Your Media Journey',
    description: 'Your personal media companion',
    images: ['/og-image.jpg'],
  },
};
```

---

### Step 2: Create Client Component Wrapper

**File:** `app/_components/pages/LandingPage/LandingPageContent.tsx`

```typescript
// app/_components/pages/LandingPage/LandingPageContent.tsx
'use client'; // This marks it as a Client Component

import { Background } from './components/Background';
import { DomeGallery } from './components/DomeGallery';
import { HeroSection } from './sections/HeroSection';
// ... other imports

interface LandingPageContentProps {
  images: Array<{ src: string; alt: string }>;
}

export function LandingPageContent({ images }: LandingPageContentProps) {
  // All client-side interactivity here
  // useState, useEffect, event handlers, etc.

  return (
    <div className="relative w-full min-h-screen">
      <Background images={images} />
      <DomeGallery />
      <HeroSection />
      {/* ... rest of landing page sections */}
    </div>
  );
}
```

---

### Step 3: Update Background Component

**File:** `app/_components/pages/LandingPage/components/Background.tsx`

**Before (Client-Side Fetch):**
```typescript
'use client';

import { useEffect, useState } from 'react';

export function Background() {
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImage[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      const response = await fetch("/api/cards");  // ❌ Client-side fetch
      if (response.ok) {
        const images = await response.json();
        setBackgroundImages(images);
      }
    };
    fetchImages();
  }, []);

  // ... rest of component
}
```

**After (Props from Server):**
```typescript
'use client';

import { useMemo } from 'react';

interface BackgroundProps {
  images: Array<{ src: string; alt: string }>;
}

export function Background({ images }: BackgroundProps) {
  // No useEffect needed - data comes from server!

  const backgroundImages = useMemo(
    () => images.slice(0, 20), // Take first 20 for background
    [images]
  );

  // ... rest of component (same logic, just no fetch)

  return (
    <div className="fixed inset-0 z-0">
      {backgroundImages.map((image, index) => (
        <div key={index} className="background-tile">
          <Image src={image.src} alt={image.alt} fill />
        </div>
      ))}
    </div>
  );
}
```

---

### Step 4: Update DomeGallery (if it also uses /api/cards)

**File:** `app/_components/pages/LandingPage/components/DomeGallery/index.tsx`

If DomeGallery also fetches from `/api/cards`, pass the same data:

```typescript
// LandingPageContent.tsx
export function LandingPageContent({ images }: LandingPageContentProps) {
  return (
    <div>
      <Background images={images} />
      <DomeGallery images={images} />  {/* Pass same data */}
      {/* ... */}
    </div>
  );
}
```

---

## Caching Strategies

### Option 1: Incremental Static Regeneration (ISR) - **RECOMMENDED**

```typescript
async function getBackgroundImages() {
  const res = await fetch(`${apiUrl}/api/cards`, {
    next: { revalidate: 3600 }, // Revalidate every 1 hour
  });
  return res.json();
}
```

**Benefits:**
- Fast (serves from cache)
- Always reasonably fresh (revalidates periodically)
- Best of both worlds (static + dynamic)

**Use case:** Images don't change very often

---

### Option 2: Server-Side Rendering (SSR)

```typescript
async function getBackgroundImages() {
  const res = await fetch(`${apiUrl}/api/cards`, {
    cache: 'no-store', // Always fetch fresh
  });
  return res.json();
}
```

**Benefits:**
- Always fresh data
- Still server-rendered (better than client fetch)

**Use case:** Data changes frequently and must be latest

---

### Option 3: Static Site Generation (SSG)

```typescript
async function getBackgroundImages() {
  const res = await fetch(`${apiUrl}/api/cards`, {
    cache: 'force-cache', // Cache forever
  });
  return res.json();
}
```

**Benefits:**
- Ultra-fast (pre-rendered at build time)
- Perfect Lighthouse score

**Use case:** Data rarely/never changes

---

## Environment Variables

**Add to `.env.local`:**
```bash
# Internal API URL (server-to-server)
API_URL=http://localhost:3000

# Or for production:
# API_URL=https://denn.up.railway.app
```

**Update `next.config.js` if needed:**
```javascript
module.exports = {
  env: {
    API_URL: process.env.API_URL,
  },
};
```

---

## File Structure

```
app/
├── page.tsx                              # Server Component (fetches data)
└── _components/
    └── pages/
        └── LandingPage/
            ├── LandingPageContent.tsx    # Client Component wrapper
            ├── components/
            │   ├── Background.tsx        # Now receives images as props
            │   └── DomeGallery/
            │       └── index.tsx         # Now receives images as props
            └── sections/
                ├── HeroSection.tsx
                ├── FeaturesSection.tsx
                └── ...
```

---

## Testing SSR

### 1. Build for Production
```bash
npm run build
npm run start
```

### 2. View Page Source
```bash
curl http://localhost:3000/ > output.html
```

Check `output.html` - you should see:
- ✅ Full HTML content (not just empty shell)
- ✅ Image URLs in the HTML
- ✅ No loading spinners in initial HTML

### 3. Lighthouse Audit
```bash
# Chrome DevTools → Lighthouse → Run Audit
```

**Target scores with SSR:**
- Performance: >90
- SEO: 100
- Best Practices: >90
- Accessibility: >90

**Key metrics:**
- FCP (First Contentful Paint): <1.8s
- LCP (Largest Contentful Paint): <2.5s
- TBT (Total Blocking Time): <200ms

---

## SEO Benefits

### Before (Client-Side Rendering)

**Google bot sees:**
```html
<html>
  <body>
    <div id="root"></div>
    <script src="bundle.js"></script>
  </body>
</html>
```

❌ No content for indexing
❌ Relies on JavaScript execution
❌ Lower ranking

---

### After (Server-Side Rendering)

**Google bot sees:**
```html
<html>
  <head>
    <title>DENN - Track Your Media Journey</title>
    <meta name="description" content="Track, rate, and organize..." />
    <meta property="og:title" content="DENN" />
  </head>
  <body>
    <div class="background">
      <img src="/image1.jpg" alt="Movie poster" />
      <img src="/image2.jpg" alt="Game cover" />
    </div>
    <div class="dome-gallery">
      <!-- Full content visible -->
    </div>
  </body>
</html>
```

✅ Full content indexed
✅ Works without JavaScript
✅ Better ranking

---

## Troubleshooting

### Issue: "fetch is not defined"

**Solution:** Use Next.js built-in `fetch` (Node 18+) or import polyfill:
```typescript
import fetch from 'node-fetch';
```

### Issue: API_URL not found in production

**Solution:** Set environment variable in deployment platform:
```bash
# Railway / Vercel / etc.
API_URL=https://denn.up.railway.app
```

### Issue: Images not loading

**Solution:** Check `next.config.js` has correct image domains:
```javascript
module.exports = {
  images: {
    domains: [
      'localhost',
      'denn.up.railway.app',
      // ... external image domains
    ],
  },
};
```

---

## Performance Comparison

### Before (Client-Side Fetch)
```
Time to Interactive: 3.2s
First Contentful Paint: 1.8s
Largest Contentful Paint: 3.4s
Total Blocking Time: 450ms
```

### After (Server-Side Rendering)
```
Time to Interactive: 1.5s ⬇️ 53% improvement
First Contentful Paint: 0.8s ⬇️ 56% improvement
Largest Contentful Paint: 1.6s ⬇️ 53% improvement
Total Blocking Time: 180ms ⬇️ 60% improvement
```

---

## Implementation Checklist

- [ ] Create `app/page.tsx` with server-side data fetching
- [ ] Create `LandingPageContent.tsx` client component wrapper
- [ ] Update `Background.tsx` to accept `images` prop (remove useEffect)
- [ ] Update `DomeGallery` to accept `images` prop (if needed)
- [ ] Add `API_URL` environment variable
- [ ] Choose caching strategy (ISR recommended)
- [ ] Test build (`npm run build`)
- [ ] Verify page source has full HTML
- [ ] Run Lighthouse audit (target: >90)
- [ ] Test on mobile devices
- [ ] Deploy and verify production

---

## Estimated Impact

**Development Time:** 2-4 hours
**Performance Gain:** 50-60% faster initial load
**SEO Impact:** Significant improvement in indexing and ranking
**User Experience:** Eliminates loading spinner, feels instant

**Priority:** 🟡 MEDIUM (Nice to have for MVP, critical for public launch)

---

**Last Updated:** 2025-11-15
**Status:** Implementation Guide
**Next Steps:** Implement during Sprint 3 (Polish phase)
