# Sprint 1 - Coordination & Dependencies (Week 1-2)

> **Purpose:** Synchronize frontend and backend work to avoid blockers
> **Sprint Goal:** Fix critical bugs that block core functionality
> **Duration:** 2 weeks

---

## 🔄 Frontend ↔ Backend Dependencies

### Critical Path (MUST be synchronized)

```
┌─────────────────────────────────────────────────────────────┐
│ WEEK 1                                                      │
└─────────────────────────────────────────────────────────────┘

Day 1-2: Backend starts BE-101 (Owner in members)
         Frontend works on FE-101 (Rating modal)

Day 3-4: Backend completes BE-101 ✅
         Backend starts BE-102 (Filter seasons)
         Frontend starts testing with BE-101 changes

Day 5: Backend continues BE-102
       Frontend works on FE-102 (Rate prompt)
       Frontend works on FE-103 (Mobile overflow)

┌─────────────────────────────────────────────────────────────┐
│ WEEK 2                                                      │
└─────────────────────────────────────────────────────────────┘

Day 1-2: Backend completes BE-102 ✅
         Backend starts BE-103 (Owner ratings)
         Frontend integrates BE-102 (season filtering)

Day 3: Backend completes BE-103 ✅
       Backend works on BE-104 (List count)
       Frontend works on FE-104 (Search cancellation)

Day 4-5: Backend completes BE-104 ✅
         Frontend integrates all backend changes
         Both teams: Integration testing
```

---

## 🚨 Dependency Matrix

| Frontend Task | Depends On Backend | Status | Priority |
|---------------|-------------------|--------|----------|
| FE-101: Rating modal | None | 🟢 Independent | 🔴 Critical |
| FE-102: Rate prompt | None | 🟢 Independent | 🔴 Critical |
| FE-103: Mobile overflow | None | 🟢 Independent | 🔴 High |
| FE-104: Search cancel | None | 🟢 Independent | 🟡 Medium |
| FE-105: Loading skeletons | None | 🟢 Independent | 🟢 Low |
| FE-106: No items found | None | 🟢 Independent | 🟢 Low |
| FE-107: Pagination buttons | None | 🟢 Independent | 🟢 Low |

| Backend Task | Blocks Frontend | Status | Priority |
|--------------|-----------------|--------|----------|
| BE-101: Owner in members | Member features | ⚠️ CRITICAL | 🔴 Critical |
| BE-102: Filter seasons | AddToList for TV | ⚠️ CRITICAL | 🔴 Critical |
| BE-103: Owner ratings | Rating display | ⚠️ HIGH | 🟡 High |
| BE-104: List count | Homepage stats | ⚠️ MEDIUM | 🟡 High |

---

## 📋 Sync Points

### Daily Standup (Every day 10am)
**Format:** 5-10 minutes, whole team

**Questions:**
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers? (especially cross-team)

**Focus Areas for Sprint 1:**
- Day 1-2: Is BE-101 on track?
- Day 3-4: Can frontend start testing BE-101?
- Day 5: Is BE-102 ready for frontend integration?
- Week 2, Day 1-2: BE-102 completed?
- Week 2, Day 3: Can frontend test owner ratings?
- Week 2, Day 4-5: Integration testing ready?

---

### Mid-Sprint Sync (Wednesday Week 1)
**Duration:** 30 minutes
**Attendees:** Frontend lead + Backend lead + PM

**Agenda:**
1. Review BE-101 progress (should be complete)
2. Preview BE-102 progress (should be ~50%)
3. Discuss any frontend blockers
4. Plan Week 2 integration

**Deliverables:**
- [ ] BE-101 completion status
- [ ] BE-102 progress percentage
- [ ] Week 2 integration plan
- [ ] Blocker resolution plan

---

### Sprint Review (Friday Week 2)
**Duration:** 1 hour
**Attendees:** Whole team + stakeholders

**Demo:**
1. **Backend:** Show API changes in Postman/Swagger
   - BE-101: Owner in members
   - BE-102: Filtered seasons
   - BE-103: Owner ratings
   - BE-104: Correct list count

2. **Frontend:** Show UI improvements
   - FE-101: Half-star ratings
   - FE-102: Fixed rate prompt
   - FE-103: Mobile responsive modals
   - FE-104: Search cancellation

3. **Integration:** Show end-to-end flows
   - Create list → Add items → Rate items
   - TV show seasons → Only valid seasons show
   - Homepage → Correct item counts

**Acceptance:**
- [ ] All critical tasks (🔴) completed
- [ ] Integration tested
- [ ] No critical bugs

---

## 🔧 Technical Integration Points

### INTEGRATION-001: Owner in Members (BE-101 → Frontend)

**Backend Change:**
```json
// New response format
{
  "members": [
    {"id": 5, "username": "owner", "is_owner": true},  // ← New field
    {"id": 10, "username": "member1"}
  ]
}
```

**Frontend Updates Needed:**
1. Update TypeScript interface:
   ```typescript
   interface Member {
     id: number;
     username: string;
     is_owner?: boolean;  // ← Add this
   }
   ```

2. Update components that check permissions:
   ```typescript
   // Before
   const isOwner = list.owner.id === currentUser.id;

   // After (still works, but can also check members)
   const isOwner = list.members.some(m => m.id === currentUser.id && m.is_owner);
   ```

**Testing Together:**
- [ ] Backend deploys to staging
- [ ] Frontend updates TypeScript types
- [ ] Frontend tests list permissions
- [ ] Frontend tests member ratings display

---

### INTEGRATION-002: Filter TV Seasons (BE-102 → Frontend)

**Backend Change:**
Returns fewer seasons (only valid ones)

**Frontend Updates Needed:**
None! Frontend just receives cleaner data.

**Testing Together:**
1. Backend deploys season filtering
2. Frontend tests AddToListModal with TV shows
3. Verify only valid seasons appear in dropdown
4. Test edge cases (TV show with all invalid seasons)

**Edge Cases to Test:**
- [ ] TV show with all seasons filtered → Show message
- [ ] TV show with 1 valid season → Show that season
- [ ] TV show with mix of valid/invalid → Show only valid

---

### INTEGRATION-003: Owner Ratings (BE-103 → Frontend)

**Backend Change:**
```json
{
  "member_ratings": [
    {"user": {"id": 5}, "rating": 9.5, "is_owner": true},  // ← Owner included now
    {"user": {"id": 10}, "rating": 8.5}
  ]
}
```

**Frontend Updates Needed:**
Update TypeScript interface:
```typescript
interface MemberRating {
  user: User;
  rating: number;
  is_owner?: boolean;  // ← Add this
}
```

**UI Enhancement (Optional):**
Show owner rating with a badge/icon:
```typescript
{memberRating.is_owner && <span className="badge">Owner</span>}
```

**Testing Together:**
- [ ] Owner rates item
- [ ] Rating appears in member_ratings
- [ ] is_owner flag is true
- [ ] Visual indicator shows (if implemented)

---

### INTEGRATION-004: List Count Fix (BE-104 → Frontend)

**Backend Change:**
`item_count` now returns actual total instead of preview size.

**Frontend Updates Needed:**
None! Frontend already expects total count.

**Testing Together:**
1. Frontend requests `?items_size=6`
2. Backend returns 6 items + `item_count=47` (real total)
3. Frontend displays "47 items" correctly
4. Verify pagination works with real count

---

## 🚧 Blocker Management

### How to Report a Blocker

**Slack:** Post in `#blockers` channel
```
🚨 BLOCKER: [FE-101] or [BE-101]
Blocked by: BE-101 (owner in members)
Impact: Can't test member permissions
Needed by: Wednesday EOD
Contact: @backend-lead
```

**Daily Standup:** Mention blocker clearly
```
"I'm blocked on FE-201 waiting for BE-101 to complete.
Expected completion: today?
Can we sync after standup?"
```

### Blocker Resolution SLA

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| 🔴 Critical | 1 hour | Same day |
| 🟡 High | 4 hours | Next day |
| 🟢 Medium | 1 day | This sprint |

---

## 📞 Communication Channels

**Slack Channels:**
- `#sprint-1` - All sprint 1 discussions
- `#blockers` - Cross-team blockers only
- `#frontend` - Frontend internal
- `#backend` - Backend internal

**When to Use Which:**
- **Quick question:** Direct message
- **Blocker:** `#blockers` channel (tag person)
- **Sprint discussion:** `#sprint-1`
- **Demo/review:** `#sprint-1` + calendar invite

---

## 📊 Progress Tracking

### Daily Progress Updates (EOD)

**Format:** Post in `#sprint-1` at 5pm
```
Frontend Progress (Day X):
✅ FE-101: 80% complete (on track)
🚧 FE-102: 30% complete (starting)
⏸️ FE-103: Blocked by BE-101

Backend Progress (Day X):
✅ BE-101: 100% complete ✓ DEPLOYED
🚧 BE-102: 50% complete (on track)
⏸️ BE-103: Not started yet
```

### Sprint Health Dashboard

**Week 1 Targets:**
- [ ] BE-101 complete by Wednesday
- [ ] FE-101, FE-102, FE-103 complete by Friday
- [ ] BE-102 at 50% by Friday

**Week 2 Targets:**
- [ ] BE-102 complete by Tuesday
- [ ] BE-103, BE-104 complete by Thursday
- [ ] All integration tested by Friday
- [ ] Sprint demo ready by Friday

---

## 🧪 Integration Testing Plan

### End-to-End Test Scenarios

**Scenario 1: Create List & Rate Items**
1. Backend: Ensure BE-101 deployed (owner in members)
2. Frontend: Create new list
3. Frontend: Add items to list
4. Frontend: Rate items (using FE-101 half-star modal)
5. Verify: Owner's rating shows in member_ratings (BE-103)

**Scenario 2: Add TV Show to List**
1. Backend: Ensure BE-102 deployed (season filtering)
2. Frontend: Search for TV show
3. Frontend: Open AddToListModal
4. Verify: Only valid seasons appear
5. Frontend: Add TV show
6. Verify: Seasons saved correctly

**Scenario 3: Homepage List Preview**
1. Backend: Ensure BE-104 deployed (correct count)
2. Frontend: Visit homepage
3. Verify: `item_count` shows real total (not 6)
4. Verify: Preview shows 6 items
5. Verify: "View all X items" link has correct count

---

## ✅ Sprint 1 Acceptance Criteria

**Backend (Must Complete):**
- [ ] BE-101: Owner in members - DEPLOYED ✓
- [ ] BE-102: Season filtering - DEPLOYED ✓
- [ ] BE-103: Owner ratings - DEPLOYED ✓
- [ ] BE-104: List count - DEPLOYED ✓
- [ ] All endpoints documented in Swagger
- [ ] All migrations run successfully

**Frontend (Must Complete):**
- [ ] FE-101: Half-star ratings working
- [ ] FE-102: Rate prompt logic fixed
- [ ] FE-103: Mobile overflow fixed
- [ ] FE-104: Search cancellation working
- [ ] No console errors on any page
- [ ] Mobile responsive verified

**Integration (Must Complete):**
- [ ] All 3 test scenarios pass
- [ ] No critical bugs found
- [ ] Performance acceptable (<3s page loads)

---

## 🎯 Definition of Done (Sprint 1)

Sprint 1 is **DONE** when:
- [ ] All 🔴 critical backend tasks deployed to staging
- [ ] All 🔴 critical frontend tasks merged
- [ ] Integration testing completed
- [ ] Demo successfully presented
- [ ] Zero critical bugs remaining
- [ ] Ready to start Sprint 2

---

**Sprint Coordinator:** _Assign PM/Lead_
**Last Updated:** Sprint Start (Week 1 Monday)
**Next Review:** Mid-Sprint Sync (Wednesday Week 1)
