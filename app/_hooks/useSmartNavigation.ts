import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseSmartNavigationOptions {
  backgroundTab?: boolean;
  onNavigationError?: (error: Error) => void;
}

export function useSmartNavigation(
  getUrl: () => string | null,
  options: UseSmartNavigationOptions = {}
) {
  const router = useRouter();
  const middleClickHandled = useRef(false);
  const { backgroundTab = true, onNavigationError } = options;

  const openInBackgroundTab = useCallback(
    (url: string) => {
      const currentWindow = window;
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (newWindow && backgroundTab) {
        setTimeout(() => {
          try {
            newWindow.blur();
          } catch {
            // Browser security restriction
          }
          setTimeout(() => {
            try {
              currentWindow.focus();
            } catch {
              // Browser security restriction
            }
          }, 50);
        }, 200);
      }
    },
    [backgroundTab]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      const url = getUrl();
      if (!url) {
        const error = new Error("Unable to determine navigation URL");
        if (onNavigationError) {
          onNavigationError(error);
        } else {
          alert("Unable to determine content type. Please try again.");
        }
        return;
      }

      const isModifierClick = e.ctrlKey || e.metaKey;

      if (isModifierClick) {
        const newWindow = window.open(url, "_blank");
        if (newWindow && backgroundTab) {
          newWindow.blur();
          window.focus();
        }
      } else {
        router.push(url);
      }
    },
    [getUrl, router, backgroundTab, onNavigationError]
  );

  const handleAuxClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        middleClickHandled.current = true;
        const url = getUrl();
        if (url) {
          openInBackgroundTab(url);
        }
        setTimeout(() => {
          middleClickHandled.current = false;
        }, 100);
      }
    },
    [getUrl, openInBackgroundTab]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 && !middleClickHandled.current) {
        e.preventDefault();
        e.stopPropagation();
        middleClickHandled.current = true;
        const url = getUrl();
        if (url) {
          openInBackgroundTab(url);
        }
        setTimeout(() => {
          middleClickHandled.current = false;
        }, 100);
      }
    },
    [getUrl, openInBackgroundTab]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        const url = getUrl();
        if (url) {
          router.push(url);
        }
      }
    },
    [getUrl, router]
  );

  return {
    handleClick,
    handleAuxClick,
    handleMouseDown,
    handleKeyDown,
  };
}
