import { Button } from "@/components/common/ui/Button";
import { PaginationControls } from "@/components/common/ui/PaginationControls";
import type { ProfileSearchParams } from "@/lib/types";

export function ProfilePagination({
  search,
  totalPages,
  onChange,
}: {
  search: ProfileSearchParams;
  totalPages: number;
  onChange: (updates: Partial<ProfileSearchParams>, resetPage?: boolean) => void;
}) {
  return (
    <div className="mt-10 flex justify-center">
      <PaginationControls
        currentPage={search.page}
        totalPages={totalPages}
        onPageChange={(page) => onChange({ page }, false)}
      />
    </div>
  );
}

export function ProfileTabLoading() {
  return (
    <div className="grid min-h-96 place-items-center" role="status">
      <span className="text-white/60">Loading profile activity…</span>
    </div>
  );
}

export function ProfileTabError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-72 place-items-center text-center">
      <div>
        <p className="text-lg font-semibold">Could not load this section.</p>
        <Button className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

export function ProfileTabEmpty({ message }: { message: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center text-white/50">
      {message}
    </div>
  );
}
