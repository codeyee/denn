from rest_framework.views import APIView
from rest_framework.response import Response
from proxy.clients.tmdb import TMDBClient
from django.conf import settings
from rest_framework import status

class TMDBSeasonDetailView(APIView):

    def filter_and_transform_episodes(self, episodes):
        transformed_episodes = []

        for episode in episodes:
            image_path = episode.get('still_path')
            image_url = f'{settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]}{image_path}' if image_path else None

            transformed_episodes.append({
                'id': episode.get('id'),
                'episode_number': episode.get('episode_number'),
                'episode_type': episode.get('episode_type'),
                'name': episode.get('name'),
                'description': episode.get('overview'),
                'release_date': episode.get('air_date'),
                'duration_minutes': episode.get('runtime'),
                'image_url': image_url
            })

        return transformed_episodes

    def filter_and_transform_data(self, data):
        episodes = data.get('episodes', [])
        transformed_episodes = self.filter_and_transform_episodes(episodes)

        poster_path = data.get('poster_path')
        poster_url = f'{settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]}{poster_path}' if poster_path else None

        return {
            'id': data.get('id'),
            'season_number': data.get('season_number'),
            'name': data.get('name'),
            'description': data.get('overview'),
            'number_of_episodes': len(transformed_episodes),
            'release_date': data.get('air_date'),
            'poster_url': poster_url,
            'episodes': transformed_episodes
        }

    def get(self, request, tv_id, season_number):
        client = TMDBClient()
        data, status_code = client.get_season_details(
            tv_id=int(tv_id),
            season_number=int(season_number)
        )

        if status_code == status.HTTP_200_OK:
            data = self.filter_and_transform_data(data)

        return Response(data, status=status_code)
