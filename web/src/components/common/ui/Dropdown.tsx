
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils/tailwindUtils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined)

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Find content children
  const trigger = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === DropdownMenuTrigger
  )
  const content = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === DropdownMenuContent
  )

  // Extract align from content props
  const contentAlign = React.isValidElement(content) && (content.props as { align?: "start" | "center" | "end" })?.align ? (content.props as { align?: "start" | "center" | "end" }).align : "start"

  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0"
  }

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative">
        {trigger}
        {open && (
          <div
            ref={menuRef}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                setOpen(false)
                triggerRef.current?.focus()
                return
              }

              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                return
              }

              const items = Array.from(
                menuRef.current?.querySelectorAll<HTMLElement>(
                  '[role^="menuitem"]',
                ) ?? [],
              )
              if (items.length === 0) return

              event.preventDefault()
              const currentIndex = items.findIndex(
                (item) =>
                  item === document.activeElement ||
                  item.contains(document.activeElement),
              )
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (currentIndex +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                      items.length
              items[nextIndex]?.focus()
            }}
            className={cn("absolute z-50 mt-3", alignClasses[contentAlign as keyof typeof alignClasses])}
          >
            {content}
          </div>
        )}
      </div>
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuTrigger({
  children,
  className,
  asChild,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
}) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu")

  const { open, setOpen, triggerRef } = context

  if (asChild && React.isValidElement(children)) {
    return (
      <Slot
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      ref={triggerRef}
      onClick={() => setOpen(!open)}
      className={cn("outline-none", className)}
      aria-expanded={open}
      aria-haspopup="menu"
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuContent({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "center" | "end"
}) {
  return (
    <div
      role="menu"
      className={cn(
        "min-w-56 overflow-hidden rounded-md border border-white/10 bg-[#1d131c] p-2 text-white shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({
  children,
  className,
  onClick,
  onSelect,
  onKeyDown,
  ...props
}: React.ComponentProps<"div"> & {
  onClick?: () => void
  onSelect?: () => void
}) {
  const context = React.useContext(DropdownMenuContext)
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
    onSelect?.()
    if (!onSelect) {
      context?.setOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (e.target !== e.currentTarget) return
    if (e.key !== "Enter" && e.key !== " ") return

    e.preventDefault()
    e.stopPropagation()
    const interactiveElement = e.currentTarget.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [role="button"]',
    )
    if (interactiveElement) {
      interactiveElement.click()
      return
    }
    onClick?.()
    onSelect?.()
    if (!onSelect) {
      context?.setOpen(false)
    }
  }

  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm p-2 text-sm outline-none transition-colors hover:bg-white/10 focus:bg-white/10 focus:text-white data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
}
