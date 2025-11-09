from rest_framework.views import APIView
from proxy.clients.igdb import IGDBClient
from proxy.mappers.igdb import IGDBMapper
from proxy.clients.tmdb import TMDBClient
from proxy.mappers.tmdb import TMDBMapper
from proxy.clients.spotify import SpotifyClient
from proxy.mappers.spotify import SpotifyMapper
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.mappers.openlibrary import OpenLibraryMapper

class TMDBBaseView(APIView):
    def get_client(self) -> TMDBClient:
        return TMDBClient()

    def get_mapper(self) -> TMDBMapper:
        return TMDBMapper(self.get_client())

class IGDBBaseView(APIView):
    def get_client(self) -> IGDBClient:
        return IGDBClient()

    def get_mapper(self) -> IGDBMapper:
        return IGDBMapper(self.get_client())

class SpotifyBaseView(APIView):
    def get_client(self) -> SpotifyClient:
        return SpotifyClient()

    def get_mapper(self) -> SpotifyMapper:
        return SpotifyMapper(self.get_client())

class OpenLibraryBaseView(APIView):
    def get_client(self) -> OpenLibraryClient:
        return OpenLibraryClient()

    def get_mapper(self) -> OpenLibraryMapper:
        return OpenLibraryMapper(self.get_client())
