/**
 * Sprint 08 / T7 — TanStack Query mutation hooks.
 *
 * The 4 mutations the sprint commits to as "optimistic with rollback":
 * - `useToggleListItemStatusMutation`  toggle COMPLETED ↔ PENDING
 * - `useRateContentMutation`           rate a list item
 * - `useAddContentToListMutation`      add a content to a list
 * - `useReorderListItemsMutation`      persist the new order
 *
 * Why a dedicated module:
 *   - keeps the optimistic-update lifecycle in one place,
 *   - lets every consumer rely on the same `onError` toast contract,
 *   - and centralises the React Query cache invalidation so we can
 *     incrementally migrate readers (`useListItemsQuery` etc.) without
 *     having to chase down call sites.
 *
 * The mutations accept opt-in `onMutate`/`onError`/`onSettled` callers
 * so each call site can plug into its own local-state snapshot
 * (Zustand store, component state) until the readers fully move to
 * React Query.
 */
export { useToggleListItemStatusMutation } from "./useToggleListItemStatusMutation";
export { useRateContentMutation } from "./useRateContentMutation";
export { useAddContentToListMutation } from "./useAddContentToListMutation";
export { useReorderListItemsMutation } from "./useReorderListItemsMutation";
