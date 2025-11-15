# Sprint 3 - List Invitations Feature 🔴 CRITICAL

> **Feature:** Collaborative List Invitations
> **Priority:** 🔴 CRITICAL MVP FEATURE
> **Estimate:** 1 week (integrated into Sprint 3)
> **Team:** Frontend + Backend

---

## ⚠️ WHY THIS IS CRITICAL FOR MVP

**List Invitations is NOT a "nice-to-have" - it's a CORE FEATURE of the application.**

### Key Reasons:

1. **Collaborative Lists are Useless Without It**
   - Users can create "collaborative" lists
   - But can't actually collaborate without inviting others
   - Feature is incomplete and misleading without invitations

2. **Friends & Family Testing Requires It**
   - MVP launch is to Friends & Family
   - They need to invite each other to test collaboration
   - Cannot properly test the app without this feature

3. **User Expectation**
   - Creating a "collaborative list" implies you can add collaborators
   - Users will immediately ask: "How do I invite someone?"
   - Not having this breaks user trust and expectations

4. **Competitive Parity**
   - All similar apps (Letterboxd, Goodreads, etc.) have invitations on day one
   - This is table-stakes functionality, not an enhancement

**Decision:** MOVED from Phase 2 to MVP Sprint 3

---

## Feature Overview

### User Flows

#### Flow 1: List Owner Invites Friend
```
1. User creates/views collaborative list
2. Clicks "Invite Members" button
3. Enters friend's email + optional message
4. Sends invitation
5. Friend receives email notification
6. Friend clicks link → Goes to invitation page
7. Friend accepts → Added to list members
8. Owner sees friend in members list
```

#### Flow 2: User Receives Invitation
```
1. Receives email: "X invited you to join 'List Name'"
2. Clicks link in email
3. Taken to invitations page (or creates account if new user)
4. Sees invitation details (list name, who invited, message)
5. Clicks "Accept" or "Decline"
6. If accepted: Redirected to list, can now collaborate
```

#### Flow 3: Manage Members
```
1. List owner views list
2. Goes to "Members" section
3. Sees all current members
4. Can remove members (except self)
5. Member receives notification they were removed
```

---

## Technical Implementation

### Backend Tasks

#### BE-3-01: Database Models
**Priority:** 🔴 CRITICAL
**Estimate:** 1 day

```python
# models/invitation.py
from django.db import models
from django.utils import timezone
from datetime import timedelta

class ListInvitation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
    ]

    list = models.ForeignKey('List', on_delete=models.CASCADE, related_name='invitations')
    inviter = models.ForeignKey('User', on_delete=models.CASCADE, related_name='sent_invitations')
    invitee_email = models.EmailField()
    invitee = models.ForeignKey('User', on_delete=models.CASCADE, related_name='received_invitations', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    message = models.TextField(blank=True, max_length=500)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)

    token = models.CharField(max_length=100, unique=True)  # For email links

    class Meta:
        unique_together = [['list', 'invitee_email', 'status']]
        indexes = [
            models.Index(fields=['invitee_email', 'status']),
            models.Index(fields=['token']),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        if not self.token:
            self.token = self.generate_token()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_token():
        import secrets
        return secrets.token_urlsafe(32)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at and self.status == 'PENDING'

    def accept(self, user):
        """Accept invitation and add user to list"""
        if self.is_expired:
            self.status = 'EXPIRED'
            self.save()
            raise ValidationError("Invitation has expired")

        if self.status != 'PENDING':
            raise ValidationError(f"Cannot accept invitation with status: {self.status}")

        self.status = 'ACCEPTED'
        self.responded_at = timezone.now()
        self.invitee = user
        self.save()

        # Add user to list members
        from .list import ListMember
        ListMember.objects.get_or_create(
            list=self.list,
            user=user,
            defaults={'role': 'MEMBER'}
        )

    def decline(self):
        """Decline invitation"""
        if self.status != 'PENDING':
            raise ValidationError(f"Cannot decline invitation with status: {self.status}")

        self.status = 'DECLINED'
        self.responded_at = timezone.now()
        self.save()

    def cancel(self):
        """Cancel invitation (owner only)"""
        if self.status != 'PENDING':
            raise ValidationError(f"Cannot cancel invitation with status: {self.status}")

        self.status = 'CANCELLED'
        self.responded_at = timezone.now()
        self.save()


class ListMember(models.Model):
    """Track list membership (extends existing model if needed)"""
    ROLE_CHOICES = [
        ('OWNER', 'Owner'),
        ('MEMBER', 'Member'),
    ]

    list = models.ForeignKey('List', on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='list_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='MEMBER')
    joined_at = models.DateTimeField(auto_now_add=True)

    # Permissions (can be expanded later)
    can_add_items = models.BooleanField(default=True)
    can_remove_items = models.BooleanField(default=True)
    can_invite_others = models.BooleanField(default=False)
    can_edit_list = models.BooleanField(default=False)

    class Meta:
        unique_together = [['list', 'user']]
        indexes = [
            models.Index(fields=['user', 'list']),
        ]

    def leave(self):
        """Leave a list (members only, not owner)"""
        if self.role == 'OWNER':
            raise ValidationError("Owner cannot leave their own list")
        self.delete()
```

#### BE-3-02: API Endpoints
**Priority:** 🔴 CRITICAL
**Estimate:** 2 days

```python
# views/invitations.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.mail import send_mail
from django.conf import settings

class ListInvitationViewSet(viewsets.ModelViewSet):
    serializer_class = ListInvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get invitations - context dependent"""
        user = self.request.user

        # For list-specific invitations (owner only)
        list_id = self.kwargs.get('list_id')
        if list_id:
            list_obj = List.objects.get(id=list_id)
            if list_obj.owner != user:
                raise PermissionDenied("Only list owner can view invitations")
            return ListInvitation.objects.filter(list_id=list_id)

        # For user's received invitations
        return ListInvitation.objects.filter(
            invitee_email=user.email,
            status='PENDING'
        ).exclude(expires_at__lt=timezone.now())

    def create(self, request, list_id=None):
        """Send invitation"""
        list_obj = List.objects.get(id=list_id)

        # Check permissions
        if list_obj.owner != request.user and not list_obj.can_member_invite(request.user):
            return Response(
                {'error': 'You do not have permission to invite members'},
                status=status.HTTP_403_FORBIDDEN
            )

        invitee_email = request.data.get('invitee_email', '').strip().lower()
        message = request.data.get('message', '')

        # Validate email
        if not invitee_email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is inviting themselves
        if invitee_email == request.user.email:
            return Response({'error': 'Cannot invite yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for existing pending invitation
        existing = ListInvitation.objects.filter(
            list=list_obj,
            invitee_email=invitee_email,
            status='PENDING'
        ).first()

        if existing:
            return Response(
                {
                    'error': 'DUPLICATE_INVITATION',
                    'message': 'An invitation to this email is already pending',
                    'existing_invitation': ListInvitationSerializer(existing).data
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is already a member
        invitee = User.objects.filter(email=invitee_email).first()
        if invitee and ListMember.objects.filter(list=list_obj, user=invitee).exists():
            return Response(
                {'error': 'User is already a member of this list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create invitation
        invitation = ListInvitation.objects.create(
            list=list_obj,
            inviter=request.user,
            invitee_email=invitee_email,
            invitee=invitee,
            message=message
        )

        # Send email
        send_invitation_email(invitation)

        return Response(
            ListInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get my pending invitations"""
        invitations = ListInvitation.objects.filter(
            invitee_email=request.user.email,
            status='PENDING'
        ).exclude(expires_at__lt=timezone.now())

        return Response(ListInvitationSerializer(invitations, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def accept_by_token(self, request, token=None):
        """Accept invitation by token (from email link)"""
        try:
            invitation = ListInvitation.objects.get(token=token)
        except ListInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid invitation token'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is authenticated
        if not request.user.is_authenticated:
            # Redirect to login with return URL
            return Response({
                'error': 'AUTHENTICATION_REQUIRED',
                'redirect_url': f'/login?next=/invitations/accept/{token}'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Verify email matches
        if invitation.invitee_email != request.user.email:
            return Response(
                {'error': 'This invitation was sent to a different email address'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            invitation.accept(request.user)
            return Response({
                'message': 'Invitation accepted',
                'list': ListSerializer(invitation.list).data
            })
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept invitation (authenticated user)"""
        invitation = self.get_object()

        if invitation.invitee_email != request.user.email:
            return Response(
                {'error': 'You are not the intended recipient'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            invitation.accept(request.user)
            return Response({
                'message': 'Invitation accepted',
                'list': ListSerializer(invitation.list).data
            })
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline invitation"""
        invitation = self.get_object()

        if invitation.invitee_email != request.user.email:
            return Response(
                {'error': 'You are not the intended recipient'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            invitation.decline()
            return Response({'message': 'Invitation declined'})
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def cancel(self, request, pk=None):
        """Cancel invitation (owner only)"""
        invitation = self.get_object()

        if invitation.inviter != request.user:
            return Response(
                {'error': 'Only the inviter can cancel this invitation'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            invitation.cancel()
            return Response({'message': 'Invitation cancelled'})
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def send_invitation_email(invitation):
    """Send invitation email"""
    accept_url = f"{settings.FRONTEND_URL}/invitations/accept/{invitation.token}"

    subject = f"{invitation.inviter.username} invited you to \"{invitation.list.name}\""

    message = f"""
Hi!

{invitation.inviter.username} has invited you to collaborate on their list "{invitation.list.name}" on DENN.

{f'Personal message: "{invitation.message}"' if invitation.message else ''}

The list currently has {invitation.list.item_count} items.

To accept this invitation, click here:
{accept_url}

This invitation will expire on {invitation.expires_at.strftime('%B %d, %Y at %I:%M %p')}.

Happy organizing!
- The DENN Team
    """

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invitation.invitee_email],
        fail_silently=False
    )
```

#### BE-3-03: URL Configuration
**Priority:** 🔴 CRITICAL
**Estimate:** 0.5 days

```python
# urls.py
urlpatterns = [
    # List invitations
    path('lists/<int:list_id>/invitations/', ListInvitationViewSet.as_view({
        'get': 'list',
        'post': 'create'
    })),

    # My invitations
    path('invitations/me/', ListInvitationViewSet.as_view({
        'get': 'me'
    })),

    # Invitation actions
    path('invitations/<int:pk>/accept/', ListInvitationViewSet.as_view({
        'post': 'accept'
    })),
    path('invitations/<int:pk>/decline/', ListInvitationViewSet.as_view({
        'post': 'decline'
    })),
    path('invitations/<int:pk>/cancel/', ListInvitationViewSet.as_view({
        'delete': 'cancel'
    })),

    # Accept by token (from email)
    path('invitations/accept/<str:token>/', ListInvitationViewSet.as_view({
        'post': 'accept_by_token'
    })),

    # Member management
    path('lists/<int:list_id>/members/', ListMemberViewSet.as_view({
        'get': 'list'
    })),
    path('lists/<int:list_id>/members/<int:user_id>/', ListMemberViewSet.as_view({
        'delete': 'destroy'
    })),
    path('lists/<int:list_id>/leave/', ListMemberViewSet.as_view({
        'post': 'leave'
    })),
]
```

---

### Frontend Tasks

#### FE-3-01: Invite Members Modal
**Priority:** 🔴 CRITICAL
**Estimate:** 1 day

**File:** `app/_components/common/modals/InviteMembersModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  message: z.string().max(500).optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: number;
  listName: string;
}

export function InviteMembersModal({
  isOpen,
  onClose,
  listId,
  listName,
}: InviteMembersModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  });

  // Fetch pending invitations
  useEffect(() => {
    if (isOpen) {
      fetchPendingInvitations();
    }
  }, [isOpen]);

  const fetchPendingInvitations = async () => {
    const response = await api.get(`/api/lists/${listId}/invitations/`);
    setPendingInvitations(response.data.filter(inv => inv.status === 'PENDING'));
  };

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    try {
      await api.post(`/api/lists/${listId}/invitations/`, {
        invitee_email: data.email,
        message: data.message,
      });

      showToast('Invitation sent!', 'success');
      reset();
      fetchPendingInvitations();
    } catch (error) {
      if (error.response?.data?.error === 'DUPLICATE_INVITATION') {
        showToast('This email already has a pending invitation', 'info');
      } else {
        showToast(error.response?.data?.error || 'Failed to send invitation', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await api.delete(`/api/invitations/${invitationId}/cancel/`);
      showToast('Invitation cancelled', 'success');
      fetchPendingInvitations();
    } catch (error) {
      showToast('Failed to cancel invitation', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invite to "${listName}"`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email Address</label>
          <input
            {...register('email')}
            type="email"
            placeholder="friend@example.com"
            className="w-full px-3 py-2 border rounded"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Personal Message (Optional)
          </label>
          <textarea
            {...register('message')}
            placeholder="Let them know why you're inviting them..."
            rows={3}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white py-2 rounded disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium mb-3">Pending Invitations</h4>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{inv.invitee_email}</p>
                  <p className="text-xs text-gray-500">
                    Sent {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelInvitation(inv.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
```

#### FE-3-02: Invitations Page
**Priority:** 🔴 CRITICAL
**Estimate:** 1 day

**File:** `app/invitations/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/invitations/me/');
      setInvitations(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await api.post(`/api/invitations/${id}/accept/`);
      showToast('Invitation accepted!', 'success');
      fetchInvitations();
    } catch (error) {
      showToast('Failed to accept invitation', 'error');
    }
  };

  const handleDecline = async (id: number) => {
    try {
      await api.post(`/api/invitations/${id}/decline/`);
      showToast('Invitation declined', 'info');
      fetchInvitations();
    } catch (error) {
      showToast('Failed to decline invitation', 'error');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  if (invitations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Invitations</h1>
        <p className="text-gray-500">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Invitations</h1>
      <div className="space-y-4">
        {invitations.map((inv) => (
          <div key={inv.id} className="border rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{inv.list.name}</h2>
                <p className="text-sm text-gray-600">
                  Invited by {inv.inviter.username}
                </p>
                {inv.message && (
                  <blockquote className="mt-2 pl-4 border-l-4 border-primary italic">
                    "{inv.message}"
                  </blockquote>
                )}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span>{inv.list.item_count} items</span>
                  <span>•</span>
                  <span>Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecline(inv.id)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(inv.id)}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### FE-3-03: Navbar Invitation Badge
**Priority:** 🔴 CRITICAL
**Estimate:** 0.5 days

**Update:** `app/_components/layout/Navbar.tsx`

```typescript
// Add to Navbar
const { data: invitationCount } = useQuery(
  ['invitation-count'],
  async () => {
    const response = await api.get('/api/invitations/me/');
    return response.data.length;
  },
  {
    refetchInterval: 60000, // Refresh every minute
  }
);

// In navbar links
<Link href="/invitations" className="relative">
  <span>Invitations</span>
  {invitationCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {invitationCount}
    </span>
  )}
</Link>
```

---

## Testing Checklist

### Backend
- [ ] Create invitation → Success
- [ ] Duplicate invitation → Error
- [ ] Accept invitation → Added to members
- [ ] Decline invitation → Status updated
- [ ] Cancel invitation → Success
- [ ] Expired invitation → Cannot accept
- [ ] Email sent → Notification received
- [ ] Token authentication → Works

### Frontend
- [ ] Send invitation → Success toast
- [ ] Pending invitations shown
- [ ] Accept invitation → Added to list
- [ ] Decline invitation → Removed
- [ ] Badge shows count
- [ ] Member list updates

---

## Definition of Done

- [ ] Backend models and migrations complete
- [ ] All API endpoints working
- [ ] Email notifications sent
- [ ] Frontend UI implemented
- [ ] Responsive on mobile
- [ ] Tests passing (80%+ coverage)
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] User tested

---

**Priority:** 🔴 CRITICAL for MVP
**Timeline:** 1 week (Sprint 3)
**Blocking:** Friends & Family launch
**Risk:** MEDIUM (email delivery dependency)
