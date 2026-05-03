
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
      className={cn(
        "min-w-56 overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-lg",
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

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm p-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      onClick={handleClick}
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

