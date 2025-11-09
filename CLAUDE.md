# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Development Server
```bash
npm run dev
```
Starts the Next.js development server on http://localhost:3000

### Building
```bash
npm run build
```
Creates an optimized production build

### Production Server
```bash
npm run start
```
Runs the production build (requires `npm run build` first)

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality

## Project Architecture

### Tech Stack
- **Framework**: Next.js 16.0.0 (App Router)
- **React**: 19.2.0
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS v4 with custom breakpoints and theme
- **State Management**: Zustand with persistence
- **UI Components**: Radix UI primitives
- **Animations**: GSAP and Motion (framer-motion successor)
- **Forms**: React Hook Form with Zod validation

### Directory Structure

```
app/
├── _components/        # React components organized by type
│   ├── cards/         # Card components (ContentCard, ListCard, etc.)
│   ├── common/        # Shared components (Modal, Carousel, List, etc.)
│   ├── forms/         # Form components (LoginForm, RegisterForm)
│   ├── layout/        # Layout components (Navbar, Footer)
│   ├── lib/           # UI library components and animations
│   └── pages/         # Page-specific components
├── _hooks/            # Custom React hooks
├── _providers/        # Context providers (StoreProvider)
├── _stores/           # Zustand stores
├── api/               # API route handlers
├── [routes]/          # Next.js file-based routing
lib/
├── api/               # API client and actions
└── utils/             # Utility functions
types/                 # TypeScript type definitions
public/               # Static assets
```

### State Management

The application uses **Zustand** for state management with five main stores:

1. **auth-store.ts**: Authentication state (user, tokens, login/register/logout)
   - Persisted to localStorage
   - Handles JWT token management
   - Auto-rehydrates on app load

2. **content-store.ts**: Content data state (movies, TV shows, games, music, books)

3. **lists-store.ts**: User lists management

4. **ui-store.ts**: UI state (modals, dropdowns, etc.)

5. **settings-store.ts**: User preferences and settings

All stores are provided via `StoreProvider` in the root layout.

### API Architecture

**Backend API Base URL**: Configured via `NEXT_PUBLIC_API_URL` environment variable
- Default: `http://localhost:8000/api`
- Production: `https://denn.up.railway.app/api`

**API Client** (`lib/api/api.ts`):
- Centralized `apiRequest()` function handles all HTTP requests
- Automatic JWT token refresh on 401 responses
- Token refresh uses a singleton promise to prevent duplicate refresh calls
- Supports both authenticated and public endpoints via `requiresAuth` flag

**useApi Hook** (`app/_hooks/useApi.ts`):
- Custom hook for making API requests with loading/error states
- Provides convenience methods: `get()`, `post()`, `put()`, `patch()`, `delete()`
- Automatic auth token handling when `requiresAuth: true`

**API Actions** (`lib/api/actions.ts`):
- Server actions for data fetching

### Content Types

The application supports five content types defined in `types/contentTypes.ts`:
- Movies (TMDB)
- TV Shows (TMDB)
- Games (IGDB)
- Music Albums (Spotify)
- Books (OpenLibrary)

Each content type has its own interface with source-specific fields. Content items include:
- External API source tracking (`source_api`, `external_id`)
- User ratings and list membership
- Metadata from source APIs

### Authentication Flow

1. User submits login/register form
2. Auth store calls backend `/api/auth/login/` or `/api/auth/register/`
3. Backend returns user data + JWT tokens (access + refresh)
4. Tokens stored in auth store and persisted to localStorage
5. `apiRequest()` automatically includes Bearer token for authenticated requests
6. On 401 response, automatically refreshes token and retries request
7. On logout, calls `/api/auth/logout/` and clears all auth state

### Routing

Uses Next.js App Router with file-based routing:
- `/` - Landing page
- `/search` - Content search
- `/content` - Content detail page (with query params)
- `/lists/[id]` - List detail page
- `/profile` - User profile
- `/login`, `/register` - Auth pages

Protected routes use `ProtectedRoute` wrapper component.

### Styling System

**Tailwind CSS v4** with custom configuration:
- Custom breakpoints: 3xl through 15xl (112rem to 304rem)
- Dark mode via `next-themes` with class strategy
- Custom CSS variables for theming in `globals.css`
- Component library uses `class-variance-authority` for variant handling
- Utility function `cn()` from `lib/utils.ts` for conditional classes

**Theme Colors** are defined as CSS variables:
- Background, foreground, card, primary, secondary, muted, accent
- Custom colors: list-item-background, hero-gradient variants

### Image Handling

Next.js Image component configured for remote image sources:
- TMDB: `https://image.tmdb.org/t/p/**`
- Spotify: `https://i.scdn.co/image/**`
- IGDB: `https://images.igdb.com/igdb/image/upload/**`
- OpenLibrary: `https://covers.openlibrary.org/b/**`

### Path Aliases

TypeScript path alias configured: `@/*` maps to project root
- Import example: `@/app/_components/...`, `@/lib/api/...`, `@/types/...`

### Forms

React Hook Form + Zod for form validation:
- Schema validation using Zod
- `@hookform/resolvers` for integration
- See `app/_components/forms/` for examples

### Component Patterns

**Page Components** (`app/_components/pages/`):
- Each major page has a dedicated folder
- Contains page-specific components and logic
- Examples: ContentDetailPage, ListDetailPage, HomePage

**Card Components** (`app/_components/cards/`):
- Reusable content display cards
- ContentCard, ListCard, EpisodeCard, etc.

**Common Components** (`app/_components/common/`):
- Shared across multiple pages
- Modal, Carousel, List, Rating, Dropdown, etc.

**UI Library** (`app/_components/lib/`):
- Base UI primitives and animations
- Radix UI wrappers (button, dialog, tabs, etc.)
- Animation components (BlurText, GradientText, Noise)

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_API_URL`: Backend API base URL
