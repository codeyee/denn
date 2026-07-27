import {
  Check,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { cn } from "@/lib/utils/tailwindUtils";

export interface ProfileFilterOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface ProfileFilterMenuProps<T extends string> {
  value: T;
  label: string;
  options: readonly ProfileFilterOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  showLabel?: boolean;
}

export function ProfileFilterMenu<T extends string>({
  value,
  label,
  options,
  onChange,
  className,
  showLabel = false,
}: ProfileFilterMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const labelId = useId();
  const valueId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const SelectedIcon = selected.icon;

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function openAndFocus(index: number) {
    setOpen(true);
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }

  function handleTriggerKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === value),
      );
      openAndFocus(event.key === "ArrowDown" ? selectedIndex : options.length - 1);
    }
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = optionRefs.current.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length;
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div ref={rootRef} className={cn("relative text-xs font-medium", className)}>
      <span
        id={labelId}
        className={showLabel ? "mb-1.5 block text-white/65" : "sr-only"}
      >
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className="flex min-h-11 w-full items-center gap-2 rounded-md border border-white/15 bg-black/35 px-3 text-left text-sm text-white outline-none transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/70 motion-reduce:transition-none"
      >
        <SelectedIcon aria-hidden="true" className="size-4 text-white/65" />
        <span id={valueId} className="min-w-0 flex-1 truncate">
          {selected.label}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-white/50 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 z-50 mt-2 min-w-full overflow-hidden rounded-lg bg-[#2c242b] p-1.5 shadow-lg"
        >
          {options.map((option, index) => {
            const Icon = option.icon;
            const active = option.value === value;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-white/75 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white motion-reduce:transition-none"
              >
                <Icon aria-hidden="true" className="size-4 text-white/60" />
                <span className="flex-1 whitespace-nowrap">{option.label}</span>
                {active ? (
                  <Check aria-hidden="true" className="size-4 text-white" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
