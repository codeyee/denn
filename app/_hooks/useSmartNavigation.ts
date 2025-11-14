import { useCallback } from "react";
import { useRouter } from "next/navigation";

export function useSmartNavigation() {
  const router = useRouter();

  return useCallback((url: string) => (e: React.MouseEvent) => {
    const isModifierClick = e.ctrlKey || e.metaKey;
    const isMiddleClick = e.button === 1;

    if (isModifierClick || isMiddleClick) {
      e.preventDefault();
      const newWindow = window.open(url, '_blank');
      if (newWindow && !e.shiftKey) {
        newWindow.blur();
        window.focus();
      }
    } else {
      e.preventDefault();
      router.push(url);
    }
  }, [router]);
}
