from rest_framework.views import APIView
from proxy.clients.igdb import IGDBClient
from proxy.mappers.igdb import IGDBMapper

class IGDBBaseView(APIView):
    def get_client(self) -> IGDBClient:
        return IGDBClient()

    def get_mapper(self) -> IGDBMapper:
        return IGDBMapper(self.get_client())

