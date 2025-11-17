# Phase 2 - Sprint 1: Post-Launch New Features

> **Sprint Goal:** Implement most-requested user features after MVP launch
> **Duration:** 2 weeks
> **Prerequisites:** Phase 1 MVP launched, 1+ week of user feedback
> **Team:** Frontend + Backend

---

## Overview

After successful Friends & Family launch, implement the highest-value features based on user feedback and competitive analysis.

**NOT blocking MVP launch** - These are enhancements for post-launch.

---

## Feature List

### 1. User Profile & Settings 👤
**Priority:** 🟡 HIGH
**Estimate:** 3 days

**Features:**
- Profile page with stats (lists created, items rated, favorite genres)
- Edit profile (username, bio, avatar)
- Settings page (privacy, notifications, preferences)
- Activity feed (recent ratings, list additions)
- Change password

**Why:** Users need to manage their account and see their activity.

---

### 2. SSO Google Login 🔐
**Priority:** 🟡 HIGH
**Estimate:** 2 days

**Features:**
- "Sign in with Google" button
- OAuth integration
- Auto-create account on first login
- Link Google to existing account

**Why:** Reduces signup friction, improves conversion.

---

### 3. Public Lists & Discovery 🌐
**Priority:** 🟢 MEDIUM
**Estimate:** 3 days

**Features:**
- List privacy settings (Public, Unlisted, Private)
- Rating privacy (Public, Private)
- Public list discovery page
- Share list URL

**Why:** Users want to share lists publicly while keeping ratings private.

---

### 4. Random Item Picker (Roulette) 🎰
**Priority:** 🟢 MEDIUM
**Estimate:** 2 days

**Features:**
- Roulette animation for PENDING items
- "What should I watch/play next?" feature
- Filter by content type
- Re-roll functionality

**Why:** Fun engagement feature, helps decision-making.

---

### 5. 11th Star Feature ⭐
**Priority:** 🟢 LOW
**Estimate:** 2 days

**Features:**
- Give max 10 items an "11th star" (bonus point)
- Visual indicator for 11-starred items
- Settings to manage favorites
- Limit enforcement

**Why:** Unique feature, highlights absolute favorites.

---

## Implementation

### Backend Tasks

**BE-P2-01: User Profile & Settings** (1 day)
- Endpoints: GET/PUT `/api/users/me/profile/`, POST `/api/users/me/avatar/`
- Models: `UserProfile`, `UserSettings`
- Avatar upload with size limits

**BE-P2-02: Google OAuth** (2 days)
- Install `google-auth`
- Endpoint: POST `/api/auth/google/`
- Auto-create user from Google data
- Return JWT tokens

**BE-P2-03: Public Lists** (1 day)
- Add `privacy` field to `List` model
- Endpoints: GET `/api/lists/public/`, GET `/api/lists/public/{slug}/`
- Filter by privacy level

**BE-P2-04: 11th Star** (1 day)
- Add `has_eleventh_star` to `UserRating` model
- Limit enforcement (max 10)
- Endpoint: POST `/api/ratings/{id}/toggle-eleventh-star/`

---

### Frontend Tasks

**FE-P2-01: User Profile** (2 days)
- Profile page: `app/profile/[username]/page.tsx`
- Edit modal: `app/_components/common/modals/EditProfileModal.tsx`
- Settings page: `app/settings/page.tsx`

**FE-P2-02: Google Login** (0.5 days)
- Install `@react-oauth/google`
- Add Google button to login/register pages
- Handle OAuth callback

**FE-P2-03: Public Lists & Discovery** (2 days)
- Discover page: `app/discover/page.tsx`
- Privacy settings in ListDetailPage
- Share modal

**FE-P2-04: Random Picker** (2 days)
- Component: `app/_components/pages/ListDetailPage/components/RandomPicker.tsx`
- Roulette animation with Motion/GSAP
- Highlight selected item

**FE-P2-05: 11th Star UI** (1 day)
- Update Rating component
- Show indicator on item cards
- Settings page to manage

---

## Success Criteria

- [ ] 80%+ users set up profile
- [ ] 30%+ try Google login
- [ ] 10+ public lists created
- [ ] 50%+ try random picker
- [ ] 5+ items with 11th star
- [ ] No critical bugs
- [ ] Positive user feedback (>7/10)

---

## Definition of Done

- [ ] All features implemented
- [ ] Responsive on mobile
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Deployed to production
- [ ] User tested
- [ ] Documentation updated

---

**Next Sprint:** Phase 2 Sprint 2 - Architecture Improvements (SWR migration, refactoring)

**Next Sprint:** Phase 2 Sprint 3 - Security Hardening & Testing
