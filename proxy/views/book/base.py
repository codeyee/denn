from rest_framework.views import APIView
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.mappers.openlibrary import OpenLibraryMapper


class OpenLibraryBaseView(APIView):
    def get_client(self) -> OpenLibraryClient:
        return OpenLibraryClient()

    def get_mapper(self) -> OpenLibraryMapper:
        return OpenLibraryMapper(self.get_client())

