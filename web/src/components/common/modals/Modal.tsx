
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/common/modals/Dialog";

interface ModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

interface ModalHeaderProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

interface ModalContentProps {
  children?: React.ReactNode;
  className?: string;
}

function Header({ children, className, title, description }: ModalHeaderProps) {
  return (
    <ShadcnDialogHeader className={className}>
      {title && <DialogTitle>{title}</DialogTitle>}
      {description && (
        <DialogDescription className="font-sans text-md text-white/80">
          {description}
        </DialogDescription>
      )}
      {children}
    </ShadcnDialogHeader>
  );
}

function Content({ children, className }: ModalContentProps) {
  return <div className={className}>{children}</div>;
}

function Modal({
  isOpen,
  onOpenChange,
  children,
  className,
  showCloseButton = true,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={className} showCloseButton={showCloseButton}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

Modal.Header = Header;
Modal.Content = Content;

export { Modal };
