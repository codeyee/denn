import { useCallback } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { useAuthStore } from "@/stores/auth-store";

export function useAuthRequiredAction(
  authenticatedOverride?: boolean,
) {
  const navigate = useNavigate();
  const location = useLocation({
    select: (current) => ({
      pathname: current.pathname,
      searchStr: current.searchStr,
    }),
  });
  const storeAuthenticated = useAuthStore(
    (state) =>
      state.isAuthenticated &&
      state.sessionResolution === "authenticated",
  );
  const isAuthenticated = authenticatedOverride ?? storeAuthenticated;

  return useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
        return;
      }

      void navigate({
        to: "/login",
        search: {
          next: `${location.pathname}${location.searchStr || ""}`,
        },
      });
    },
    [
      isAuthenticated,
      location.pathname,
      location.searchStr,
      navigate,
    ],
  );
}
