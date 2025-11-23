from rest_framework.views import APIView
from proxy.clients.igdb import IGDBClient
from proxy.mappers.igdb import IGDBMapper
from proxy.clients.tmdb import TMDBClient
from proxy.mappers.tmdb import TMDBMapper
from proxy.clients.spotify import SpotifyClient
from proxy.mappers.spotify import SpotifyMapper
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.mappers.openlibrary import OpenLibraryMapper
from proxy.utils import filter_dictionary

class DynamicFieldsMixin:
    def apply_dynamic_fields(self, data, request):
        fields_param = request.query_params.get('fields')
        if fields_param:
            fields = [f.strip() for f in fields_param.split(',')]
            if isinstance(data, list):
                return [filter_dictionary(item, fields) for item in data]
            return filter_dictionary(data, fields)
        return data

class TMDBBaseView(DynamicFieldsMixin, APIView):
    def get_client(self) -> TMDBClient:
        return TMDBClient()

    def get_mapper(self) -> TMDBMapper:
        return TMDBMapper(self.get_client())

class IGDBBaseView(DynamicFieldsMixin, APIView):
    def get_client(self) -> IGDBClient:
        return IGDBClient()

    def get_mapper(self) -> IGDBMapper:
        return IGDBMapper(self.get_client())

class SpotifyBaseView(DynamicFieldsMixin, APIView):
    def get_client(self) -> SpotifyClient:
        return SpotifyClient()

    def get_mapper(self) -> SpotifyMapper:
        return SpotifyMapper(self.get_client())

class OpenLibraryBaseView(DynamicFieldsMixin, APIView):
    def get_client(self) -> OpenLibraryClient:
        return OpenLibraryClient()

    def get_mapper(self) -> OpenLibraryMapper:
        return OpenLibraryMapper(self.get_client())
