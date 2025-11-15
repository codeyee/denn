# Legacy Requirements Analysis

> **Date:** 2025-11-15
> **Purpose:** Map legacy requirements to current sprint structure
> **Status:** Sprint 1 COMPLETED ✅

---

## Sprint 1 Status: ✅ COMPLETED

Based on the git status and recent commits, **Sprint 1 has been completed**. The following tasks were delivered:

### Completed Sprint 1 Tasks:

#### Frontend:
- ✅ **FE-101:** Fix Rating Modal - Support Half Stars (Commit: c053fe9)
- ✅ **FE-102:** Fix "Rate This Item" Prompt Logic
- ✅ **FE-103:** Fix AddToListModal Mobile/Small screens Overflow
- ✅ **FE-104:** Cancel Debounced Search Requests
- ✅ **FE-105:** Add Loading Skeletons for List Items (Commit: 48b1271 - ListItemPlaceholder component)
- ✅ **FE-106:** Show "No Items Found" in Search
- ✅ **FE-107:** Fix List Grouping Pagination Buttons (Commit: 98a0aa1 - grouped button styling)

#### Backend:
- ✅ **BE-101:** Include Owner in Members List
- ✅ **BE-102:** Filter Invalid TV Show Seasons
- ✅ **BE-103:** Return Owner's Ratings in member_ratings
- ✅ **BE-104:** Fix Homepage List Count

---

## Legacy Requirements Mapping

### ✅ DONE (Covered by Sprint 1 or already implemented)

| Legacy Requirement | Status | Implementation |
|-------------------|--------|----------------|
| Fix rating modal (half stars) | ✅ DONE | Sprint 1 - FE-101 |
| Fix "Rate this item" prompt | ✅ DONE | Sprint 1 - FE-102 |
| Fix AddToList modal overflow on mobile | ✅ DONE | Sprint 1 - FE-103 |
| Cancel search requests on debounce | ✅ DONE | Sprint 1 - FE-104 |
| Add loading placeholders for lists | ✅ DONE | Sprint 1 - FE-105 |
| Show "No items found" in search | ✅ DONE | Sprint 1 - FE-106 |
| Fix list grouping pagination buttons | ✅ DONE | Sprint 1 - FE-107 |
| Include owner in members list | ✅ DONE | Backend Sprint 1 - BE-101 |
| Filter invalid TV seasons | ✅ DONE | Backend Sprint 1 - BE-102 |
| Return owner ratings | ✅ DONE | Backend Sprint 1 - BE-103 |
| Fix list count on homepage | ✅ DONE | Backend Sprint 1 - BE-104 |
| Homepage card hover expansion | ✅ DONE | Implemented by developer |

### 📋 PLANNED (In Sprint 2)

| Legacy Requirement | Sprint 2 Task | Priority |
|-------------------|---------------|----------|
| Redesign AddToList modal (checkbox behavior) | FE-201 | 🔴 CRITICAL |
| Fix list grouping (multi-level with checkboxes) | FE-202 | 🔴 CRITICAL |
| Multi-search endpoint | BE-202 + FE-203 | 🟡 HIGH |
| Calculate list_rating server-side | BE-201 + FE-204 | 🟡 HIGH |
| Validate duplicate items | BE-203 + FE-205 | 🟡 HIGH |
| Remove notes field from list items | BE-204 | 🟢 MEDIUM |
| Random list names generator | FE-206 | 🟢 MEDIUM |
| Loading skeletons (additional) | FE-207 | 🟢 LOW |

### ❌ MISSING (Need to add to Sprint 2.5)

These requirements from the legacy list are NOT covered in any current sprint:

#### Frontend Requirements:

1. **Homepage - Random preview items**
   - Legacy: "Homepage, los items a sacar para el preview de la lista deberían de ser aleatorios"
   - Status: NOT PLANNED
   - Priority: 🟢 MEDIUM

2. **Homepage - Fetch all lists with page_size=0**
   - Legacy: "Homepage, creo que podríamos usar page_size=0 para conseguir todas las listas del usuario de una"
   - Status: NOT PLANNED
   - Priority: 🟢 LOW

3. **Homepage - Slow navigation to list detail**
   - Legacy: "Homepage, al dar click en la lista se demora para ir, creo que antes hace algun api call"
   - Status: NOT PLANNED
   - Priority: 🟡 MEDIUM

4. **Card hover - Change add to list button cursor**
   - Legacy: "Card hover, cambiar el boton de add to list, y ponerle cursor pointer"
   - Status: NOT PLANNED
   - Priority: 🟢 LOW

5. **Card hover - Show full title**
   - Legacy: "Card hover, si se hace hover mostrar el titulo sin que se corte"
   - Status: NOT PLANNED
   - Priority: 🟢 LOW

6. **Content detail - Consolidate rating API calls**
   - Legacy: "Content detail, veo que se hacen dos API Calls para ratings, uno con page_size=10 y otro con page_size=1"
   - Status: NOT PLANNED
   - Priority: 🟡 MEDIUM

7. **Content detail - Where to watch alignment**
   - Legacy: "Content detail con Where to watch, estan desalineadas las plataformas"
   - Status: NOT PLANNED
   - Priority: 🟢 LOW

8. **Content detail - Where to play icon mapping**
   - Legacy: "Where to play, mapear las imagenes desde el frontend"
   - Status: NOT PLANNED
   - Priority: 🟢 MEDIUM

9. **Content detail - Gallery photo modal**
   - Legacy: "Content detail con gallery, poder dar click a las fotos y que se expanda la foto como un modal"
   - Status: NOT PLANNED
   - Priority: 🟢 LOW

10. **TV Show - Check if already in list before adding**
    - Legacy: "En add tv shows, si se elige añadir el tv show no se hace la pegada para ver si está en la lista"
    - Status: NOT PLANNED (BE-203 handles duplicate validation, but frontend needs to check BEFORE attempting add)
    - Priority: 🟡 MEDIUM

11. **List detail - Paginated items with background full fetch**
    - Legacy: "Listas, ya que tenemos paginacion, podriamos traer por paginas los items, pero tener listo e 'segundo plano' la respuesta de la lista full"
    - Status: NOT PLANNED
    - Priority: 🟢 LOW

12. **Random item picker feature**
    - Legacy: "Feature para conseguir aleatoriamente un item PENDING de la lista, debería de hacer alguna animación tipo ruleta"
    - Status: NOT PLANNED
    - Priority: 🟢 LOW (Future feature)

13. **Homepage - Show metadata on card hover**
    - Legacy: "Homepage, en el Hover de los items mostrar la metadata, no la description"
    - Status: NOT PLANNED
    - Priority: 🟢 LOW

#### Backend Requirements:

14. **Backend - Filter future/null release dates**
    - Legacy: "Backend, no devolver items que se lanzan en el futuro o que directamente tengan release date null"
    - Status: Partially in BE-205 (Sprint 2) but marked as 🟢 MEDIUM
    - Priority: 🟡 MEDIUM (Should be higher)

15. **Backend - Check if item is in user's lists endpoint**
    - Legacy: "Backend debería de tener un endpoint que solo traiga para x item si está en x lista del usuario"
    - Status: NOT PLANNED
    - Priority: 🟡 MEDIUM

16. **Backend - Search caching (lowercase)**
    - Legacy: "Cache para busquedas en minuscula"
    - Status: NOT PLANNED
    - Priority: 🟢 LOW (Performance optimization)

17. **Backend - Request retries**
    - Legacy: "Reintentos en el Front y back"
    - Status: NOT PLANNED
    - Priority: 🟡 MEDIUM

#### Organization & Polish:

18. **Use font-sans for non-titles**
    - Legacy: "Cambiar a font-sans todo lo que no sean titulos, textos principales o textos de botones"
    - Status: NOT PLANNED
    - Priority: 🟢 LOW

19. **Standardize colors**
    - Legacy: "Estandarizar colores"
    - Status: NOT PLANNED
    - Priority: 🟡 MEDIUM

20. **Dynamic page titles**
    - Legacy: "Cambiar el titulo de las paginas dinamicamente"
    - Status: NOT PLANNED
    - Priority: 🟢 MEDIUM

21. **Responsive design**
    - Legacy: "Responsive design"
    - Status: Partially covered in Sprint 4 checklist
    - Priority: 🔴 CRITICAL (For launch)

### 🚀 FUTURE FEATURES (Beyond MVP - Phase 2)

| Legacy Requirement | Phase | Priority |
|-------------------|-------|----------|
| List invitations | Phase 2 | 🟡 MEDIUM |
| User profile frontend | Phase 2 | 🟡 MEDIUM |
| SSO Google | Phase 2 | 🟢 LOW |
| Public lists / Private ratings | Phase 2 | 🟢 MEDIUM |
| 11th star feature | Phase 2 | 🟢 LOW |

---

## Recommendation: Create Sprint 2.5

Insert a new sprint between current Sprint 2 and Sprint 3 to handle the missing requirements:

### Sprint 2.5 - UX Polish & Missing Features

#### 🔴 CRITICAL Tasks (Must Complete for MVP)

**FE-2.5-01: Responsive Design Implementation**
- Priority: 🔴 CRITICAL
- Estimate: 5 days
- Make all pages responsive (mobile, tablet, desktop)
- Test on all devices from Sprint 4 checklist
- Dependencies: None
- **NOTE:** This is essential for launch

**FE-2.5-02: Standardize Colors**
- Priority: 🟡 HIGH
- Estimate: 2 days
- Audit all color usage across components
- Create centralized color variables
- Replace hardcoded colors
- Dependencies: None

#### 🟡 HIGH PRIORITY Tasks

**FE-2.5-03: Content Detail - Consolidate Rating API Calls**
- Priority: 🟡 HIGH
- Estimate: 1 day
- Combine two rating API calls into one
- Reduce unnecessary backend load
- Improve page load performance
- Dependencies: Needs backend discussion

**FE-2.5-04: Homepage Navigation Performance**
- Priority: 🟡 HIGH
- Estimate: 1 day
- Issue: Delay when clicking list to navigate
- Remove blocking API calls before navigation
- Use optimistic navigation with data fetching after
- Dependencies: None

**FE-2.5-05: TV Show - Pre-check if in List**
- Priority: 🟡 HIGH
- Estimate: 1 day
- Before adding TV show, check if already in list
- Use BE-203 duplicate validation endpoint
- Show appropriate message to user
- Dependencies: BE-203 (Sprint 2)

**BE-2.5-01: Check Item in User Lists Endpoint**
- Priority: 🟡 HIGH
- Estimate: 2 days
- Create endpoint: `GET /api/content/{id}/in-lists/?user_id={user_id}`
- Returns list of user's lists containing the item
- Enables frontend to show "Already in X lists" before adding
- Dependencies: None

**BE-2.5-02: Request Retry Logic**
- Priority: 🟡 HIGH
- Estimate: 2 days
- Implement exponential backoff for failed requests
- Apply to external API calls (TMDB, IGDB, etc.)
- Handle transient failures gracefully
- Dependencies: None

**BE-2.5-03: Elevate Release Date Filtering**
- Priority: 🟡 HIGH (Upgrade from 🟢 MEDIUM)
- Estimate: Already planned in BE-205
- Move from Sprint 2 "MEDIUM" to Sprint 2.5 "HIGH"
- Apply to all search and list endpoints
- Dependencies: None

#### 🟢 MEDIUM PRIORITY Tasks

**FE-2.5-06: Dynamic Page Titles**
- Priority: 🟢 MEDIUM
- Estimate: 1 day
- Set page title dynamically based on content
- Examples: "The Matrix - DENN", "My Watchlist - DENN"
- Improves SEO and browser tab usability
- Dependencies: None

**FE-2.5-07: Where to Play Icon Mapping**
- Priority: 🟢 MEDIUM
- Estimate: 1 day
- Map platform names to icon URLs/components
- Display platform logos in "Where to Watch/Play"
- Dependencies: None

**FE-2.5-08: Homepage - Random Preview Items**
- Priority: 🟢 MEDIUM
- Estimate: 0.5 days
- Randomize items shown in list preview on homepage
- Currently shows first N items
- Dependencies: BE-2.5-04 (Backend support)

**BE-2.5-04: Homepage Random Items**
- Priority: 🟢 MEDIUM
- Estimate: 1 day
- Add `random=true` query parameter to list items endpoint
- Return random sample instead of first N items
- Dependencies: None

#### 🟢 LOW PRIORITY Tasks (Nice to Have)

**FE-2.5-09: Card Hover Improvements**
- Priority: 🟢 LOW
- Estimate: 0.5 days
- Show full title on hover (no truncation)
- Add cursor pointer to "Add to List" button
- Improve visual feedback
- Dependencies: None

**FE-2.5-10: Content Detail - Where to Watch Alignment**
- Priority: 🟢 LOW
- Estimate: 0.5 days
- Fix platform logo alignment issues
- Use CSS grid for consistent spacing
- Dependencies: None

**FE-2.5-11: Content Detail - Gallery Photo Modal**
- Priority: 🟢 LOW
- Estimate: 2 days
- Add click handler to gallery photos
- Expand photo in modal/lightbox
- Add navigation between photos
- Dependencies: None

**FE-2.5-12: Homepage - Metadata on Card Hover**
- Priority: 🟢 LOW
- Estimate: 0.5 days
- Show metadata instead of description on card hover
- Better information density
- Dependencies: None

**FE-2.5-13: Font Standardization**
- Priority: 🟢 LOW
- Estimate: 1 day
- Apply font-sans to body text
- Keep font-display for headings and important text
- Audit all font usage
- Dependencies: None

**FE-2.5-14: List Detail - Background Full Fetch**
- Priority: 🟢 LOW
- Estimate: 2 days
- Fetch paginated items for display
- Prefetch full list in background for faster navigation
- Dependencies: None

**BE-2.5-05: Search Caching (Lowercase)**
- Priority: 🟢 LOW
- Estimate: 2 days
- Implement caching layer for search queries
- Normalize to lowercase for cache keys
- Set reasonable TTL (e.g., 5 minutes)
- Dependencies: None

---

## Proposed Sprint Structure (Updated)

### Sprint 1: ✅ COMPLETED (Week 1-2)
- All critical bugfixes
- Foundation improvements
- **Status:** DONE

### Sprint 2: 🚧 IN PROGRESS (Week 3-4)
- Backend optimizations
- Multi-search endpoint
- Calculated ratings
- Duplicate validation
- **Status:** READY TO START

### **Sprint 2.5: UX Polish & Missing Features (Week 5-6)** ← NEW
- Responsive design (CRITICAL)
- Color standardization
- Performance improvements
- Missing API endpoints
- **Status:** NEW - INSERT HERE

### Sprint 3: SSR Implementation (Week 7)
- Landing page SSR
- Performance optimization
- SEO improvements
- **Status:** PLANNED

### Sprint 4: Launch Preparation (Week 8)
- Final testing
- Device testing
- Performance audit
- Launch checklist
- **Status:** PLANNED

---

## Sprint 2.5 Definition of Done

A task is complete when:
- [ ] Code implemented and tested locally
- [ ] No console errors or warnings
- [ ] Responsive on mobile, tablet, and desktop
- [ ] Code reviewed by 1+ teammate
- [ ] Follows GUIDELINES.md standards
- [ ] Performance tested (no regressions)
- [ ] Accessibility tested (keyboard navigation, screen readers)
- [ ] Merged to feature branch

---

## Updated Timeline

| Sprint | Duration | Weeks | Deliverables |
|--------|----------|-------|--------------|
| Sprint 1 | ✅ DONE | Week 1-2 | Critical bugfixes, foundation |
| Sprint 2 | 2 weeks | Week 3-4 | Backend optimizations, multi-search |
| **Sprint 2.5** | **2 weeks** | **Week 5-6** | **Responsive design, UX polish** |
| Sprint 3 | 1 week | Week 7 | SSR implementation |
| Sprint 4 | 1 week | Week 8 | Launch preparation |
| **TOTAL** | **8 weeks** | | **Friends & Family Launch** |

---

## Priority Matrix

```
             CRITICAL     HIGH           MEDIUM         LOW
Sprint 1:    ✅ DONE      ✅ DONE        ✅ DONE        ✅ DONE
Sprint 2:    4 tasks      3 tasks        2 tasks        -
Sprint 2.5:  1 task       5 tasks        4 tasks        9 tasks
Sprint 3:    1 task       -              -              -
Sprint 4:    Launch       Testing        Polish         -
```

---

**Last Updated:** 2025-11-15
**Status:** Sprint 1 COMPLETED ✅ | Sprint 2.5 NEW 🆕
**Next Action:** Review and approve Sprint 2.5 scope
