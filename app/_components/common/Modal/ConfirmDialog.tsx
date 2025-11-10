"use client";

import Modal from "@/app/_components/common/Modal";
import { Button } from "@/app/_components/lib/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconColor: "text-red-500",
          confirmButtonVariant: "destructive" as const,
        };
      case "warning":
        return {
          iconColor: "text-yellow-500",
          confirmButtonVariant: "default" as const,
        };
      default:
        return {
          iconColor: "text-blue-500",
          confirmButtonVariant: "default" as const,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleCancel}
      showCloseButton={!isLoading}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`mb-4 ${variantStyles.iconColor}`}>
          <AlertTriangle className="w-12 h-12" />
        </div>

        <Modal.Header
          title={title}
          description={description}
        />

        <div className="flex justify-center gap-3 mt-6 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variantStyles.confirmButtonVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
