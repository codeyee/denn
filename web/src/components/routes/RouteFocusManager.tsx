import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

export function RouteFocusManager() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#main-content")?.focus({
        preventScroll: true,
      });
    });
  }, [pathname]);

  return null;
}
