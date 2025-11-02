"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Modal from "@/app/_components/Modal";
import { Button } from "@/app/_components/ui/button";
import Input from "@/app/_components/Input";
import { ListType } from "@/types/contentTypes";

// Define validation schema
const createListSchema = z.object({
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

type CreateListFormData = z.infer<typeof createListSchema>;

interface CreateListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateList: (
    name: string,
    description?: string,
    listType?: ListType
  ) => Promise<void>;
  isLoading?: boolean;
}

export default function CreateListModal({
  isOpen,
  onOpenChange,
  onCreateList,
  isLoading,
}: CreateListModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<CreateListFormData>({
    resolver: zodResolver(createListSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      description: "",
      listType: ListType.PERSONAL,
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: CreateListFormData) => {
    try {
      await onCreateList(
        data.name,
        data.description || undefined,
        data.listType
      );

      // Reset form and close modal on success
      reset();
      onOpenChange(false);
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to create list",
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
          title="Create New List"
          description="Create a new list to organize your favorite content"
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
            <label htmlFor="list-type" className="block text-sm font-medium">
              List Type <span className="text-red-500">*</span>
            </label>
            <select
              id="list-type"
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-sans bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              {...register("listType")}
            >
              <option value={ListType.PERSONAL}>Personal</option>
              <option value={ListType.SHARED}>Shared</option>
            </select>
            {errors.listType && (
              <p className="text-red-500 text-sm mt-1">
                {errors.listType.message}
              </p>
            )}
          </div>

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
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-sans resize-none disabled:opacity-50 disabled:cursor-not-allowed"
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
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create List"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
