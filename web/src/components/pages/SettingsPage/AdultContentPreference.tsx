import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { authActions } from "@/lib/api/actions";
import { queryKeys } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";

interface AdultContentPreferenceProps {
  enabled: boolean;
}

export function AdultContentPreference({
  enabled,
}: AdultContentPreferenceProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEnabled, setCurrentEnabled] = useState(enabled);

  useEffect(() => {
    setCurrentEnabled(enabled);
  }, [enabled]);

  async function updatePreference(nextEnabled: boolean) {
    const previousEnabled = currentEnabled;
    setCurrentEnabled(nextEnabled);
    setIsPending(true);
    setError(null);

    try {
      const profile = await authActions.patchProfile({
        allow_adult_content: nextEnabled,
      });
      useAuthStore.getState().setUser(profile);
      await queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
      await router.invalidate();
    } catch (caughtError) {
      setCurrentEnabled(previousEnabled);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update the preference.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section
      className="mt-8 border-t border-gray-700 pt-6"
      aria-labelledby="adult-content-heading"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 id="adult-content-heading" className="text-lg font-semibold">
            Adult content
          </h2>
          <p className="mt-1 max-w-xl text-sm text-gray-300">
            Automatic recommendations always exclude explicit content. When
            enabled, deliberate searches may include adult results where the
            provider supports them, and explicit artwork on detail pages is
            shown without blur. When disabled, explicit detail artwork is
            blurred and can be revealed for the current view only.
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3">
          <span className="sr-only">Allow adult content in search and detail artwork</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={currentEnabled}
            disabled={isPending}
            onChange={(event) => void updatePreference(event.target.checked)}
          />
          <span aria-hidden="true">{currentEnabled ? "On" : "Off"}</span>
        </label>
      </div>
      <p className="mt-3 text-sm text-gray-400" aria-live="polite">
        {isPending ? "Saving preference…" : error}
      </p>
    </section>
  );
}
