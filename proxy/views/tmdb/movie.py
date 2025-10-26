from .base import TMDBBaseView
from .utils import normalize_movie


class TMDBMovieDetailView(TMDBBaseView):

    def get(self, request, movie_id):
        client = self.get_client()

        return self.handle_api_call(
            client.get_movie_details,
            transformer=normalize_movie,
            movie_id=int(movie_id)
        )
