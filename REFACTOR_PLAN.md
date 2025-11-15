# Component Reorganization & Refactoring Plan
**Date**: 2025-11-14
**Scope**: Flatten single-file folders, reorganize _components/common, refactor oversized components

---

## Current Issues

### 1. Single-File Folders (CRITICAL RULE #5 Violation)
**Found**: 15 folders with ONLY index.tsx

**_components/common/** (7 folders):
- ProtectedRoute/index.tsx (44 lines) → ProtectedRoute.tsx
- ThemeProvider/index.tsx (11 lines) → ThemeProvider.tsx
- CountryProvider/index.tsx (7 lines) → CountryProvider.tsx
- Rating/StarRating.tsx (109 lines) → StarRating.tsx
- Carousel/index.tsx (209 lines ⚠️ OVER LIMIT) → Carousel.tsx
- Dropdown/index.tsx (170 lines) → Dropdown.tsx

**_components/cards/** (5 folders):
- CreateListCard/index.tsx (51 lines) → CreateListCard.tsx
- EpisodeCard/index.tsx (106 lines) → EpisodeCard.tsx
- LandingCard/index.tsx (58 lines) → LandingCard.tsx
- ListCard/index.tsx (110 lines) → ListCard.tsx
- PlaceholderCard/index.tsx (53 lines) → PlaceholderCard.tsx

**_components/forms/** (2 folders):
- LoginForm/index.tsx → LoginForm.tsx
- RegisterForm/index.tsx → RegisterForm.tsx

**_components/layout/** (2 folders):
- Navbar/index.tsx (257 lines ⚠️ OVER LIMIT) → Navbar.tsx
- Footer/index.tsx → Footer.tsx

### 2. Oversized Components Requiring Refactor
| File | Lines | Over Limit | Priority | Blocked? |
|------|-------|------------|----------|----------|
| ContentCard/index.tsx | 379 | +179 | HIGH | No |
| ListItemCard/index.tsx | 321 | +121 | HIGH | No |
| Card/index.tsx | 317 | +117 | HIGH | No |
| Navbar/index.tsx | 257 | +57 | MEDIUM | No |
| Carousel/index.tsx | 209 | +9 | MEDIUM | No |
| AddToListModal.tsx | 589 | +389 | HIGH | No |
| ContentDetailPage/index.tsx | 802 | +602 | CRITICAL | **YES - Skip** |

**Note**: ContentDetailPage is BLOCKED (another dev working on features)

### 3. Disorganized _components/common/
Current structure is flat with no logical grouping, making it hard to navigate.

---

## Proposed New Structure

### A. _components/common/ → Better Organization

**BEFORE** (Flat, hard to navigate):
```
common/
├── Carousel/index.tsx
├── CountryProvider/index.tsx
├── Dropdown/index.tsx
├── EmptyState.tsx
├── ErrorState.tsx
├── List/... (6 files)
├── LoadingCarousel.tsx
├── Modal/... (7 files)
├── PaginationControls.tsx
├── ProtectedRoute/index.tsx
├── Rating/StarRating.tsx
├── Select.tsx
├── StatusBadge.tsx
└── ThemeProvider/index.tsx
```

**AFTER** (Logically grouped):
```
common/
├── modals/
│   ├── Modal.tsx (base component, renamed from Modal/index.tsx)
│   ├── AddToListModal.tsx
│   ├── ConfirmDialog.tsx
│   ├── CreateListModal.tsx
│   ├── EditListModal.tsx
│   ├── RateItemModal.tsx
│   └── RatingModal.tsx
│
├── lists/
│   ├── VerticalList.tsx (renamed from List/VerticalList.tsx)
│   ├── ListItem.tsx
│   ├── ExpandableListItem.tsx
│   ├── ReorderableListItem.tsx
│   └── TrackListItem.tsx
│
├── providers/
│   ├── ThemeProvider.tsx (flattened from ThemeProvider/index.tsx)
│   ├── CountryProvider.tsx (flattened from CountryProvider/index.tsx)
│   └── ProtectedRoute.tsx (flattened from ProtectedRoute/index.tsx)
│
├── state/
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   └── LoadingCarousel.tsx
│
└── ui/
    ├── Carousel.tsx (flattened from Carousel/index.tsx, needs refactor)
    ├── Dropdown.tsx (flattened from Dropdown/index.tsx)
    ├── Select.tsx
    ├── StatusBadge.tsx
    ├── PaginationControls.tsx
    └── StarRating.tsx (flattened from Rating/StarRating.tsx)
```

**Benefits**:
- ✅ Clear logical grouping (modals, lists, providers, state, ui)
- ✅ Easier to find components
- ✅ Follows domain-driven organization
- ✅ No single-file folders
- ✅ Better developer experience

### B. _components/cards/ → Flatten + Refactor

**BEFORE**:
```
cards/
├── Card/index.tsx (317 lines ⚠️)
├── ContentCard/index.tsx (379 lines ⚠️)
├── CreateListCard/index.tsx (51 lines)
├── EpisodeCard/index.tsx (106 lines)
├── LandingCard/index.tsx (58 lines)
├── ListCard/index.tsx (110 lines)
├── ListItemCard/index.tsx (321 lines ⚠️)
│   └── ReorderableListItemCard.tsx
└── PlaceholderCard/index.tsx (53 lines)
```

**AFTER**:
```
cards/
├── Card/
│   ├── index.tsx (~150 lines, refactored)
│   └── hooks/
│       └── useCardHover.ts (~80 lines)
├── ContentCard/
│   ├── index.tsx (~150 lines, refactored)
│   └── hooks/
│       └── useContentCard.ts (~100 lines)
├── ListItemCard/
│   ├── index.tsx (~150 lines, refactored)
│   ├── ReorderableListItemCard.tsx
│   └── hooks/
│       └── useListItemCard.ts (~90 lines)
├── CreateListCard.tsx (51 lines, flattened)
├── EpisodeCard.tsx (106 lines, flattened)
├── LandingCard.tsx (58 lines, flattened)
├── ListCard.tsx (110 lines, flattened)
└── PlaceholderCard.tsx (53 lines, flattened)
```

**Note**: Card, ContentCard, and ListItemCard need refactoring, so they become multi-file folders.

### C. _components/forms/ → Flatten

**Simple change**:
```
forms/
├── LoginForm.tsx (flattened from LoginForm/index.tsx)
└── RegisterForm.tsx (flattened from RegisterForm/index.tsx)
```

### D. _components/layout/ → Flatten + Refactor Navbar

**BEFORE**:
```
layout/
├── Navbar/index.tsx (257 lines ⚠️)
└── Footer/index.tsx
```

**AFTER**:
```
layout/
├── Navbar/
│   ├── index.tsx (~120 lines, refactored)
│   ├── hooks/
│   │   └── useNavbarState.ts (~60 lines)
│   └── components/
│       ├── NavbarMenu.tsx (~50 lines)
│       └── UserMenu.tsx (~40 lines)
└── Footer.tsx (flattened from Footer/index.tsx)
```

---

## Implementation Steps

### Phase 1: Flatten Single-File Folders (2-3 hours)

**Step 1.1**: Flatten _components/cards/ (simple ones)
- CreateListCard/index.tsx → CreateListCard.tsx
- EpisodeCard/index.tsx → EpisodeCard.tsx
- LandingCard/index.tsx → LandingCard.tsx
- ListCard/index.tsx → ListCard.tsx
- PlaceholderCard/index.tsx → PlaceholderCard.tsx

**Step 1.2**: Flatten _components/forms/
- LoginForm/index.tsx → LoginForm.tsx
- RegisterForm/index.tsx → RegisterForm.tsx

**Step 1.3**: Flatten _components/layout/ (simple ones)
- Footer/index.tsx → Footer.tsx

**Step 1.4**: Update all imports for Phase 1

### Phase 2: Reorganize _components/common/ (3-4 hours)

**Step 2.1**: Create new folder structure
```bash
mkdir -p app/_components/common/modals
mkdir -p app/_components/common/lists
mkdir -p app/_components/common/providers
mkdir -p app/_components/common/state
mkdir -p app/_components/common/ui
```

**Step 2.2**: Move files to new locations
- Modal/* → modals/ (rename index.tsx to Modal.tsx)
- List/* → lists/
- ThemeProvider/index.tsx → providers/ThemeProvider.tsx
- CountryProvider/index.tsx → providers/CountryProvider.tsx
- ProtectedRoute/index.tsx → providers/ProtectedRoute.tsx
- EmptyState, ErrorState, LoadingCarousel → state/
- Carousel, Dropdown, Select, StatusBadge, PaginationControls, StarRating → ui/

**Step 2.3**: Update all imports for common/ reorganization

### Phase 3: Refactor Oversized Card Components (1-2 days)

**Step 3.1**: Refactor Card/index.tsx (317 → <200 lines)
- Extract hover logic to useCardHover hook
- Keep Card folder (now multi-file)

**Step 3.2**: Refactor ContentCard/index.tsx (379 → <200 lines)
- Extract navigation/action logic to useContentCard hook
- Keep ContentCard folder (now multi-file)

**Step 3.3**: Refactor ListItemCard/index.tsx (321 → <200 lines)
- Extract actions/state to useListItemCard hook
- Keep ListItemCard folder (now multi-file)

### Phase 4: Refactor Other Oversized Components (1 day)

**Step 4.1**: Refactor Navbar/index.tsx (257 → <200 lines)
- Extract state to useNavbarState hook
- Create NavbarMenu and UserMenu components
- Keep Navbar folder (now multi-file)

**Step 4.2**: Refactor Carousel.tsx (209 → <200 lines)
- Extract carousel logic to useCarousel hook
- Move to common/ui/Carousel/ folder

**Step 4.3**: Refactor AddToListModal (589 → <200 lines)
- Extract list selection logic to useListSelection hook
- Create sub-components (ListSelector, CreateListForm)
- Create AddToListModal/ folder in common/modals/

### Phase 5: Update CODE_QUALITY_REPORT.md (1 hour)

**Step 5.1**: Update metrics
- Components over 200 lines: 11 → ~2-3 (DomeGallery, ContentDetailPage)
- Single-file folders: 15 → 0
- Architecture compliance: 75% → ~95%

**Step 5.2**: Document new structure
- Add new folder organization to report
- Update remaining issues

**Step 5.3**: Update progress
- Mark completed phases
- Update next steps

---

## Expected Outcomes

### Metrics Before vs After

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Single-file folders** | 15 | 0 | -100% ✅ |
| **Components over 200 lines** | 11 | ~2-3 | -73% ✅ |
| **Largest component** | 934 lines | 589 lines | -37% ✅ |
| **Architecture compliance** | 75% | ~95% | +27% ✅ |
| **Common folder files** | 25 | 25 (better organized) | +∞ DX ✅ |

### Code Quality Improvements
- ✅ 100% compliance with CRITICAL RULE #5 (no single-file folders)
- ✅ Clearer component organization (domain-based grouping)
- ✅ Easier navigation and discoverability
- ✅ Reduced component sizes (better SRP compliance)
- ✅ Extracted testable hooks
- ✅ Improved developer experience

### Remaining Work (Future)
- ⏳ DomeGallery refactor (934 lines) - specialized component
- ⏳ ContentDetailPage refactor (802 lines) - BLOCKED by other dev
- ⏳ Final polish and documentation

---

## Estimated Timeline

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Flatten Simple Folders | 2-3 hours | Low |
| Phase 2: Reorganize common/ | 3-4 hours | Medium |
| Phase 3: Refactor Card Components | 1-2 days | Medium-High |
| Phase 4: Refactor Other Components | 1 day | Medium |
| Phase 5: Update Documentation | 1 hour | Low |
| **TOTAL** | **3-4 days** | **Medium** |

**Priority**: HIGH (architectural compliance, better organization)

---

## Risks & Mitigation

### Risks
1. **Import updates**: 100+ files may import from flattened folders
   - **Mitigation**: Use find-and-replace with verification
2. **Breaking changes**: Moving files might break imports
   - **Mitigation**: Test incrementally, verify builds after each phase
3. **Merge conflicts**: Other dev working on ContentDetailPage
   - **Mitigation**: Skip ContentDetailPage, communicate with team

### Testing Strategy
1. Build after each phase: `npm run build`
2. Run dev server: `npm run dev`
3. Manual testing of affected components
4. Git commits after each successful phase

---

## Notes

- **LandingPage**: Already compliant! ✅ Good reference implementation
- **ListDetailPage, HomePage, SearchPage**: Already refactored ✅
- **ContentDetailPage**: BLOCKED - Skip for now
- **DomeGallery**: Specialized component - Lower priority
- **common/ reorganization**: Biggest UX improvement for developers
- **All changes**: Follow CLAUDE.md, AGENTS.md, GEMINI.md guidelines

---

**Prepared by**: Claude Code
**Status**: Ready for implementation
**Next Step**: Get approval, then start Phase 1
