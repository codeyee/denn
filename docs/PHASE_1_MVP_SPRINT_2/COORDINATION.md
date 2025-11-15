# Sprint 2 - Coordination & Dependencies (Week 3-4)

> **Sprint Goal:** Complete core MVP features and UX improvements
> **Focus:** AddToList redesign, search optimization, list grouping, server-side calculations

---

## 🔄 Critical Dependencies

### Frontend → Backend Dependencies

| Frontend Task | Requires Backend | Priority | Timeline |
|---------------|------------------|----------|----------|
| FE-201: Integrate list_rating display | BE-201: Calculate ratings server-side | 🔴 Critical | Week 3 |
| FE-202: Multi-search UI | BE-202: Multi-search endpoint | 🟡 High | Week 4 |
| FE-203: Duplicate prevention UI | BE-203: Validate duplicates | 🟡 High | Week 4 |

### Backend Tasks (Independent)
- BE-204: Remove notes field (no frontend changes needed)
- BE-205: Filter future dates (frontend benefits automatically)

---

## 📋 Sprint Schedule

**Week 3:**
- Days 1-2: Backend implements BE-201 (server-side calculations)
- Days 1-3: Frontend works on FE-201 (AddToList redesign) - independent
- Days 3-5: Frontend integrates BE-201, starts FE-202 (List grouping)
- Days 4-5: Backend starts BE-202 (multi-search endpoint)

**Week 4:**
- Days 1-2: Backend completes BE-202, starts BE-203
- Days 1-3: Frontend completes FE-202, works on FE-203 (Search optimization)
- Day 3: Backend completes BE-203, BE-204, BE-205
- Days 4-5: Integration testing, bug fixes

---

## 🔧 Integration Points

### INT-201: Server-Side Rating Calculations
**Backend delivers:** `list_rating` and `member_rating_count` fields
**Frontend updates:** Display pre-calculated values (no client-side math)

### INT-202: Multi-Search Endpoint
**Backend delivers:** `POST /api/content/multi-search/`
**Frontend updates:** Replace 5 API calls with 1

### INT-203: Duplicate Validation
**Backend delivers:** 400 error if item already in list
**Frontend updates:** Show user-friendly error message

---

## ✅ Sprint 2 Done Criteria
- [ ] AddToList modal redesigned (checkbox behavior)
- [ ] List grouping multi-level working
- [ ] Search 5x faster (multi-search endpoint)
- [ ] No duplicate items can be added
- [ ] All integrations tested

---

**Coordinator:** _Assign_
**Sprint Review:** Friday Week 4, 3pm
