from rest_framework.views import APIView
from proxy.clients.spotify import SpotifyClient
from proxy.mappers.spotify import SpotifyMapper

class SpotifyBaseView(APIView):
    def get_client(self) -> SpotifyClient:
        return SpotifyClient()

    def get_mapper(self) -> SpotifyMapper:
        return SpotifyMapper(self.get_client())

