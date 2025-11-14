import { useRef, useEffect, useState, useCallback } from "react";

interface UseCardHoverProps {
  disableHover?: boolean;
  hasHoverContent?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
}

export function useCardHover({
  disableHover = false,
  hasHoverContent = false,
  onHoverChange,
}: UseCardHoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    width: 0,
  });
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    if (onHoverChange) {
      onHoverChange(isHovered);
    }
  }, [isHovered, onHoverChange]);

  const shouldShowHoverContent = isDesktop && hasHoverContent && !disableHover;

  useEffect(() => {
    const updatePosition = () => {
      if (isHovered && cardRef.current && shouldShowHoverContent) {
        const rect = cardRef.current.getBoundingClientRect();

        setPopoverPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    updatePosition();

    if (isHovered && shouldShowHoverContent) {
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isHovered, shouldShowHoverContent]);

  const handleMouseEnter = useCallback(() => {
    if (isDesktop && !disableHover) {
      setIsHovered(true);
    }
  }, [isDesktop, disableHover]);

  const handleMouseLeave = useCallback(() => {
    if (!disableHover) {
      setIsHovered(false);
    }
  }, [disableHover]);

  return {
    cardRef,
    isHovered,
    isDesktop,
    popoverPosition,
    shouldShowHoverContent,
    handleMouseEnter,
    handleMouseLeave,
  };
}
