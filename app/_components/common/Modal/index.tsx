"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/_components/lib/dialog";

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
      {description && <DialogDescription>{description}</DialogDescription>}
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

export default Modal;
