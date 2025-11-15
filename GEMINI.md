# Gemini AI Assistant Guidelines

This document provides guidelines for Gemini AI when working with this Next.js codebase.

> **📘 Code Quality Standards:** All code must follow the standards in **[CODING_STANDARDS.md](./CODING_STANDARDS.md)**. This includes SOLID principles, DRY enforcement, component size limits (<200 lines), and TypeScript strict mode.

---

## Project Overview

A Next.js web application that serves as a media aggregator. Users can discover and track movies, TV shows, games, music, and books. Features include user authentication, personalized content feeds, and custom media lists.

**Key Technologies:**
- **Framework:** Next.js 16.0.0 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Authentication:** JWT-based with backend API
- **API Sources:** TMDB, Spotify, IGDB, Open Library

---

## Building and Running

**Install Dependencies:**
```bash
npm install
```

**Development Server:**
```bash
npm run dev
```
Opens at [http://localhost:3000](http://localhost:3000)

**Production Build:**
```bash
npm run build
npm run start
```

**Linting:**
```bash
npm run lint
```

---

## Architecture

Component-based architecture with clear separation of concerns:

**Directory Structure:**
- `app/` - Application logic (pages, components, hooks, stores)
- `lib/` - Utility functions and API client
- `public/` - Static assets (fonts, images)

**Key Folders:**
- `app/_components/` - Organized by type (cards, common, forms, layout, pages)
- `app/_hooks/` - Custom React hooks
- `app/_stores/` - Zustand state stores
- `lib/api/` - API client and actions
- `types/` - TypeScript type definitions

---

## Development Conventions

**Coding Style:**
- ESLint enforces consistent style
- See [CODING_STANDARDS.md](./CODING_STANDARDS.md) for detailed rules

**State Management:**
- Zustand for global state
- Stores organized by feature: `auth-store`, `content-store`, `lists-store`, `ui-store`, `settings-store`

**API Interaction:**
- All requests handled by `lib/api/api.ts`
- Consistent interface for authenticated and unauthenticated requests
- `useApi` hook provides simple API interface

**Component Organization:**
- By feature and type (cards, common, forms, layout, pages)
- Maximum 200 lines per component (see CODING_STANDARDS.md)
- Extract logic to custom hooks in `hooks/` subdirectory
- Extract UI to sub-components in `components/` subdirectory

**Authentication:**
- `useAuth` hook provides auth state and actions
- JWT token management with automatic refresh

---

## 📋 Code Quality Standards

**MANDATORY - See [CODING_STANDARDS.md](./CODING_STANDARDS.md) for details:**

1. **Component Size Limits**
   - Maximum: 200 lines (HARD LIMIT)
   - Recommended: 150 lines
   - Extract logic to hooks, UI to sub-components

2. **SOLID Principles**
   - Single Responsibility (one reason to change)
   - Open/Closed (extensible via composition)
   - Liskov Substitution (interchangeable subtypes)
   - Interface Segregation (no unused props)
   - Dependency Inversion (depend on abstractions)

3. **DRY Principle**
   - Zero tolerance for code duplication
   - Extract utilities to `lib/utils/`
   - Extract components to `app/_components/common/`

4. **File Organization**
   - No single-file folders
   - Helper functions at end of file
   - Named exports (not default)
   - Avoid single-use config files

5. **TypeScript Strict Mode**
   - No `any` type
   - No type assertions
   - Proper interfaces for all props
   - Use discriminated unions

6. **Minimal Commenting**
   - Code must be self-explanatory
   - Only comment complex business logic or workarounds
   - Prefer clear naming over comments

---

## Quick Reference

**Extracted Utilities:**
- `buildContentUrl()` → `lib/utils/navigationUtils.ts`
- `getSourceApi()` → `lib/utils/contentTypeUtils.ts`
- `<StatusBadge />` → `app/_components/common/StatusBadge.tsx`

**Component Architecture Pattern:**
```
app/_components/pages/FeaturePage/
├── index.tsx              # Orchestrator (~120 lines)
├── hooks/                 # Business logic
│   ├── useFeatureData.ts
│   └── useFeatureActions.ts
├── components/            # UI sub-components
│   ├── FeatureHeader.tsx
│   └── FeatureContent.tsx
└── utils.ts              # Pure helper functions
```

**Reference Implementation:**
- ListDetailPage: 2,114 lines → 391 lines (-81.5%)
- See CODING_STANDARDS.md for full breakdown

---

**Remember:** Clean code is about clarity and maintainability, not cleverness.
