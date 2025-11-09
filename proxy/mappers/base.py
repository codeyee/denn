from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from proxy.models.base import Images


class BaseMapper(ABC):
    def __init__(self, client):
        self.client = client

    @abstractmethod
    def map_search_item(self, item: Dict[str, Any]) -> Any:
        pass

    @abstractmethod
    def map_detail(self, data: Dict[str, Any], **kwargs) -> Any:
        pass

    def _build_images(
        self,
        poster_path: Optional[str],
        gallery_path: Optional[str],
        additional_data: Optional[Any] = None,
        url_builder=None
    ) -> Images:
        raise NotImplementedError("Subclasses should implement _build_images")
