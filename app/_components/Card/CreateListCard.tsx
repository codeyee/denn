"use client";

import { Plus } from "lucide-react";

interface CreateListCardProps {
  onCreateList: (name: string, description?: string) => Promise<unknown>;
  isLoading?: boolean;
}

export default function CreateListCard({ onCreateList, isLoading }: CreateListCardProps) {
  const handleClick = () => {
    // TODO: Open modal to create list
    console.log("Create list modal will open here");
  };

  return (
    <div className="w-full md:basis-1/2 md:max-w-[360px]">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="relative overflow-hidden rounded-2xl h-[240px] md:h-[480px] w-full backdrop-blur-lg border-4 border-dashed border-gray-600 hover:border-gray-500 transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-white transition-colors">
          <Plus className="w-16 h-16 md:w-24 md:h-24 mb-4" />
          <span className="text-xl font-bold drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)]">
            Create New List
          </span>
        </div>
      </button>
    </div>
  );
}
