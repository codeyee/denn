"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateListModal } from "@/app/_components/common/modals/CreateListModal";
import { ListType } from "@/lib/types";

const CARD_ASPECT_RATIO = "5 / 8";

interface CreateListCardProps {
  onCreateList: (name: string, description?: string, listType?: ListType) => Promise<unknown>;
  isLoading?: boolean;
}

export function CreateListCard({ onCreateList, isLoading }: CreateListCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleCreateList = async (name: string, description?: string, listType?: ListType) => {
    await onCreateList(name, description, listType);
  };

  return (
    <>
      <div className="w-full" style={{ aspectRatio: CARD_ASPECT_RATIO }}>
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="relative overflow-hidden rounded-2xl h-full w-full backdrop-blur-lg border-4 border-dashed border-gray-600 hover:border-gray-500 transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-white transition-colors">
            <Plus className="w-12 h-12 md:w-16 md:h-16 mb-2 md:mb-3" />
            <span className="text-base md:text-lg font-bold drop-shadow-text">
              Create New List
            </span>
          </div>
        </button>
      </div>

      <CreateListModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCreateList={handleCreateList}
        isLoading={isLoading}
      />
    </>
  );
}
