import { useState, useCallback } from "react";
import { ContentType } from "@/lib/api/types";
import { Content } from "@/types";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";

export function useContentCardModal(item: Content) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const getContentItemForModal = useCallback(() => {
    const contentType = item.type as ContentType;
    const sourceApi = getSourceApi(contentType);
    const externalId = String(item.id);

    return {
      source_api: sourceApi,
      external_id: externalId,
      content_type: contentType,
    };
  }, [item]);

  return {
    isOpen,
    openModal,
    closeModal,
    contentItem: getContentItemForModal(),
  };
}
