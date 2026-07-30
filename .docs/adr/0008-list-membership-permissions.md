# ADR 0008: Explicit list memberships and role policy

## Status

Accepted and implemented for issue [#61](https://github.com/codeyee/denn/issues/61)
on 2026-07-29.

## Context

`UserList.members` was an implicit many-to-many relation. The owner was
synthetic for personal lists and authorization rules were duplicated in
views, serializers, and list services. That made it impossible to express or
enforce `owner`, `editor`, and `viewer` consistently.

## Decision

Promote the existing M2M table to the explicit `ListMembership` model with a
role. The migration keeps the existing physical table and adds the role
column, so current member rows are preserved without a table copy.

| Action | owner | editor | viewer | anonymous public |
| --- | --- | --- | --- | --- |
| Read list/items | yes | yes | yes | yes |
| Add/update/remove content | yes | yes | no | no |
| Reorder/apply canonical order | yes | yes | no | no |
| Change list settings/delete list | yes | no | no | no |
| Read/manage memberships | yes / yes | yes / no | yes / no | no |
| Send/cancel invitations | yes | no | no | no |
| Change a member role | yes | no | no | no |

Roles are lowercase in API payloads and uppercase in the database. A generic
role update can only set `editor` or `viewer`; ownership transfer is not part
of this issue. The owner is the single source of ownership through
`UserList.owner` and exactly one persisted `owner` membership.

`PERSONAL` lists are owner-only for authorization even if anomalous legacy
membership rows remain. `DYNAMIC` lists are system-managed projections of
tracking and never participate in collaborative memberships or invitations;
their owner may still customize the projection order, preserving the existing
personal-order behavior, while content membership remains system-managed.
Personal progress remains `UserContentTracking`; `ListItem.context_status`
continues to represent shared-list context only.

Invitations accept an optional `viewer|editor` role and default to `editor` to
preserve the prior behavior of accepted shared-list members. Public list
serializers expose only the public owner/collaborator usernames and list
content; they do not expose emails, invitations, or private membership
metadata.

## Migration and rollback

Migration `0022_list_membership_roles` is idempotent: existing rows default to
`editor`, every `PERSONAL` or `SHARED` list receives or repairs one owner row,
and stale owner-role rows are demoted before the unique owner constraint is
added. `DYNAMIC` rows are not seeded. The schema operations are reversible;
rollback deliberately preserves membership rows because the old implicit M2M
schema can safely read the additional owner rows.

Migration `0023_list_invitation_role` defaults existing pending invitations to
`editor`.

## Deferred decisions

- Per-member item state needs a separate product decision and remains outside
  #61; current shared item state stays contextual.
- Ownership transfer needs an atomic API and audit semantics before it is
  exposed.
- Add-to-List checkbox UX and the random pending picker remain Sprint 12
  follow-ups.

## Performance and verification

List reads use membership joins/prefetches and filtered member counts. The
existing list query budgets remain release gates; any changed budget must be
recorded in `.docs/perf/baseline.md` with a reason.
