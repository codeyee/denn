from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.clients.igdb import IGDBClient
from typing import Dict, Any, Tuple, Optional, Callable

class IGDBBaseView(APIView):
    def get_client(self) -> IGDBClient:
        return IGDBClient()

    def transform_response(
        self,
        data: Dict[str, Any],
        status_code: int,
        transformer: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None
    ) -> Response:
        if status_code == http_status.HTTP_200_OK and transformer: data = transformer(data)
        return Response(data, status=status_code)

    def handle_api_call(
        self,
        api_method: Callable,
        transformer: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None,
        **kwargs
    ) -> Response:
        data, status_code = api_method(**kwargs)
        return self.transform_response(data, status_code, transformer)

