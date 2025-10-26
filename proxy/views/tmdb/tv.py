from rest_framework.views import APIView
from rest_framework.response import Response
from proxy.clients.tmdb import TMDBClient
from django.conf import settings
from rest_framework import status

class TMDBTVDetailView(APIView):

    def filter_and_transform_seasons(self, seasons):
        transformed_seasons = []

        for season in seasons:
            poster_path = season.get('poster_path')
            poster_url = f'{settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]}{poster_path}' if poster_path else None

            transformed_seasons.append({
                'id': season.get('id'),
                'season_number': season.get('season_number'),
                'name': season.get('name'),
                'description': season.get('overview'),
                'number_of_episodes': season.get('episode_count'),
                'release_date': season.get('air_date'),
                'poster_url': poster_url
            })

        return transformed_seasons

    def filter_and_transform_data(self, data):
        poster_path = data.get('poster_path')
        backdrop_path = data.get('backdrop_path')

        poster_url = f'{settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]}{poster_path}' if poster_path else None
        backdrop_url = f'{settings.PROXY_API["TMDB"]["BACKDROP_BASE_URL"]}{backdrop_path}' if backdrop_path else None

        return {
            'id': data.get('id'),
            'title': data.get('name'),
            'original_title': data.get('original_name'),
            'original_language': data.get('original_language'),
            'description': data.get('overview'),
            'poster_url': poster_url,
            'backdrop_url': backdrop_url,
            'release_date': data.get('first_air_date'),
            'status': data.get('status'),
            'number_of_seasons': data.get('number_of_seasons'),
            'number_of_episodes': data.get('number_of_episodes'),
            'seasons': self.filter_and_transform_seasons(data.get('seasons', []))
        }

    def get(self, request, tv_id):
        language = request.query_params.get('language')
        client = TMDBClient()

        append_to_response = request.query_params.get('append_to_response')

        data, status_code = client.get_tv_details(tv_id=int(tv_id))

        if status_code == status.HTTP_200_OK:
            data = self.filter_and_transform_data(data)

        return Response(data, status=status_code)

