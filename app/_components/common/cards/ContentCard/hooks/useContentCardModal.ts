import { useState, useCallback, useMemo } from "react";
import { ContentType } from "@/lib/types";
import { Content } from "@/lib/types";
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

  const contentItem = useMemo(() => {
    const contentType = item.type as ContentType;
    const sourceApi = getSourceApi(contentType);
    const externalId = String(item.id);

    return {
      source_api: sourceApi,
      external_id: externalId,
      content_type: contentType,
    };
  }, [item.type, item.id]);

  return {
    isOpen,
    openModal,
    closeModal,
    contentItem,
  };
}
