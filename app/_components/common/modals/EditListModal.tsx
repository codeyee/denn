"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/app/_components/common/modals/Modal";
import { Button } from "@/app/_components/common/ui/Button";
import { Input } from "@/app/_components/common/ui/Input";
import { ListType } from "@/lib/api/types";

// Define validation schema
const editListSchema = z.object({
  name: z
    .string()
    .min(1, "List name is required")
    .min(3, "List name must be at least 3 characters")
    .max(100, "List name must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  listType: z.nativeEnum(ListType),
});

type EditListFormData = z.infer<typeof editListSchema>;

interface EditListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateList: (
    name: string,
    description?: string,
    listType?: ListType
  ) => Promise<void>;
  isLoading?: boolean;
  initialData?: {
    name: string;
    description?: string;
    listType: ListType;
  };
}

export function EditListModal({
  isOpen,
  onOpenChange,
  onUpdateList,
  isLoading,
  initialData,
}: EditListModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<EditListFormData>({
    resolver: zodResolver(editListSchema),
    mode: "onTouched",
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      listType: initialData?.listType || ListType.PERSONAL,
    },
  });

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen && initialData && !isLoading) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
        listType: initialData.listType,
      });
    } else if (!isOpen) {
      reset();
    }
  }, [isOpen, initialData, reset, isLoading]);

  const onSubmit = async (data: EditListFormData) => {
    try {
      await onUpdateList(
        data.name,
        data.description || undefined,
        data.listType
      );

      // Close modal on success
      onOpenChange(false);
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to update list",
      });
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      showCloseButton={!isLoading}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header
          title="Edit List"
          description="Update your list details"
        />

        <Modal.Content className="space-y-6 mt-4">
          {errors.root && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 mb-2">
              <p className="text-red-500 text-sm">{errors.root.message}</p>
            </div>
          )}

          <Input
            label="List Name"
            type="text"
            placeholder="e.g., My Favorite Movies"
            error={errors.name?.message}
            disabled={isLoading}
            required
            {...register("name")}
          />

          <div className="space-y-2">
            <label
              htmlFor="list-description"
              className="block text-sm font-medium"
            >
              Description (Optional)
            </label>
            <textarea
              id="list-description"
              placeholder="Add a description for your list..."
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-sans resize-none cursor-text disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>
        </Modal.Content>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="cursor-pointer">
            {isLoading ? "Updating..." : "Update List"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
