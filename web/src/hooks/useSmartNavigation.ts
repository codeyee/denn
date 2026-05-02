import { useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

const MIDDLE_CLICK_RESET_DELAY = 100;
const BACKGROUND_TAB_FOCUS_DELAY = 50;

interface UseSmartNavigationOptions {
  backgroundTab?: boolean;
  onNavigationError?: (error: Error) => void;
}

function handleNavigationError(
  onNavigationError?: (error: Error) => void,
): void {
  const error = new Error("Unable to determine navigation URL");
  if (onNavigationError) {
    onNavigationError(error);
  } else {
    alert("Unable to determine content type. Please try again.");
  }
}

type UrlGetter = () => string | null | Promise<string | null>;

export function useSmartNavigation(
  getUrl: UrlGetter,
  options: UseSmartNavigationOptions = {},
) {
  const navigate = useNavigate();
  const middleClickHandled = useRef(false);
  const { backgroundTab = true, onNavigationError } = options;

  const openInBackgroundTab = useCallback(
    (url: string) => {
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (newWindow && backgroundTab) {
        setTimeout(() => {
          try {
            window.focus();
          } catch {
            // Browser security restriction
          }
        }, BACKGROUND_TAB_FOCUS_DELAY);
      }
    },
    [backgroundTab],
  );

  const resetMiddleClickFlag = useCallback(() => {
    setTimeout(() => {
      middleClickHandled.current = false;
    }, MIDDLE_CLICK_RESET_DELAY);
  }, []);

  const handleMiddleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      middleClickHandled.current = true;
      const url = await getUrl();
      if (url) {
        openInBackgroundTab(url);
      }
      resetMiddleClickFlag();
    },
    [getUrl, openInBackgroundTab, resetMiddleClickFlag],
  );

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      const isModifierClick = e.ctrlKey || e.metaKey;
      const url = await getUrl();
      if (!url) {
        handleNavigationError(onNavigationError);
        return;
      }

      if (isModifierClick) {
        openInBackgroundTab(url);
      } else {
        void navigate({ to: url });
      }
    },
    [getUrl, navigate, openInBackgroundTab, onNavigationError],
  );

  const handleAuxClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        handleMiddleClick(e);
      }
    },
    [handleMiddleClick],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 && !middleClickHandled.current) {
        handleMiddleClick(e);
      }
    },
    [handleMiddleClick],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        const url = await getUrl();
        if (url) {
          void navigate({ to: url });
        }
      }
    },
    [getUrl, navigate],
  );

  return {
    handleClick,
    handleAuxClick,
    handleMouseDown,
    handleKeyDown,
  };
}
