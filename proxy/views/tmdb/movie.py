from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.clients.tmdb import TMDBClient
from django.conf import settings
from rest_framework import status

class TMDBMovieDetailView(APIView):

    def filter_and_transform_data(self, data):
        poster_path = data.get('poster_path')
        backdrop_path = data.get('backdrop_path')

        poster_url = f'{settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]}{poster_path}' if poster_path else None
        backdrop_url = f'{settings.PROXY_API["TMDB"]["BACKDROP_BASE_URL"]}{backdrop_path}' if backdrop_path else None

        return {
            'id': data.get('id'),
            'imdb_id': data.get('imdb_id'),
            'title': data.get('title'),
            'original_title': data.get('original_title'),
            'original_language': data.get('original_language'),
            'description': data.get('overview'),
            'poster_url': poster_url,
            'backdrop_url': backdrop_url,
            'release_date': data.get('release_date'),
            'duration_minutes': data.get('runtime'),
            'status': data.get('status')
        }

    def get(self, request, movie_id):
        language = request.query_params.get('language')
        client = TMDBClient()

        append_to_response = request.query_params.get('append_to_response')

        data, status_code = client.get_movie_details(movie_id=int(movie_id))

        if status_code == http_status.HTTP_200_OK:
            data = self.filter_and_transform_data(data)

        return Response(data, status=status_code)

