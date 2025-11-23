# Sprint 1 - Optimization & Flex Fields (Week 1)

> **Sprint Goal:** Implement Dynamic Fields & Expansions to solve Over/Under Fetching
> **Duration:** 1 week
> **Team:** Backend

---

## ⚠️ PREREQUISITES

**Before starting this sprint, ensure:**

-   [ ] Existing DRF ViewSets are functional (Legacy mode)

---

## 🔴 CRITICAL Tasks (Must Complete)

### BE-101: Install & Configure `drf-flex-fields`

**Priority:** 🔴 CRITICAL (Architecture)
**Estimate:** 0.5 days
**Owner:** _Assign_
**Frontend Impact:** Enables `?fields=` and `?expand=` query params globally.

**Current Behavior:**
Serializers return fixed fields defined in `Meta.fields`.

**New Behavior:**
All Serializers inheriting from the new Base Class will support dynamic field selection.

**Implementation:**

1. Install library: `pip install drf-flex-fields`
2. Create a core base serializer in `utils/serializers.py` (or similar).

```python
from rest_framework import serializers
from flex_fields import FlexFieldsModelSerializer

class BaseFlexSerializer(FlexFieldsModelSerializer):
    """Base class for all application serializers"""
    pass
```

**Acceptance Criteria:**

-   [ ] Library installed in requirements.txt
-   [ ] BaseFlexSerializer created
-   [ ] CI/CD pipeline passes with new dependency

---

### BE-102: Refactor Core Serializers (Lists & Items)

**Priority:** 🔴 CRITICAL (Optimization)
**Estimate:** 2 days
**Owner:** _Assign_
**Uses Backend:** BE-101

**Current Behavior:**

-   `ListItemSerializer` always returns full `content_item` object (Over-fetching).
-   `ListDetailSerializer` requires separate calls for owner info (Under-fetching).

**New Behavior:**
Configure `expandable_fields` to allow on-demand joins.

**Implementation:**

```python
# users/serializers.py
class UserSerializer(BaseFlexSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'email']

# content/serializers.py
class ContentItemSerializer(BaseFlexSerializer):
    class Meta:
        model = ContentItem
        fields = '__all__'

# lists/serializers.py
class ListItemSerializer(BaseFlexSerializer):
    class Meta:
        model = ListItem
        fields = ['id', 'status', 'added_at']
        expandable_fields = {
            'content_item': (ContentItemSerializer, {'many': False}),
            'list': ('lists.serializers.ListSerializer', {'many': False})
        }

class ListSerializer(BaseFlexSerializer):
    class Meta:
        model = List
        fields = ['id', 'name', 'type', 'description']
        expandable_fields = {
            'owner': (UserSerializer, {'many': False}),
            'items': (ListItemSerializer, {'many': True})
        }
```

**Acceptance Criteria:**

-   [ ] `ListItemSerializer` supports expansion of `content_item`
-   [ ] `ListSerializer` supports expansion of `owner` and `items`
-   [ ] Default requests (no params) still work as before (Backward Compatibility)
-   [ ] Unit tests for expanded fields

---

### BE-103: Optimize ViewSets (N+1 Prevention)

**Priority:** 🟡 HIGH (Performance)
**Estimate:** 1 day
**Owner:** _Assign_
**Uses Backend:** BE-102

**Current Issue:**
If a user requests `?expand=content_item`, Django might execute 1 query per item (N+1 problem) if `select_related` isn't used.

**Implementation:**
Utilize `FlexFieldsMixin` inside ViewSets or manually optimize `get_queryset`.

```python
from flex_fields.views import FlexFieldsMixin

class ListItemViewSet(FlexFieldsMixin, viewsets.ModelViewSet):
    queryset = ListItem.objects.all()
    serializer_class = ListItemSerializer

    # Configuration for automatic JOINs when 'expand' is used
    permit_list_expands = ['content_item', 'list']
```

**Acceptance Criteria:**

-   [ ] ViewSets inherit from `FlexFieldsMixin` (where applicable)
-   [ ] Verify SQL queries count when using `?expand` (should use JOINs, not N queries)
-   [ ] `permit_list_expands` configured for security (whitelist)

---

## ✅ Definition of Done

-   [ ] `?fields=id,name` works on core endpoints
-   [ ] `?expand=relation` works on core endpoints
-   [ ] No regression in existing frontend features
-   [ ] Swagger/OpenAPI updated automatically
