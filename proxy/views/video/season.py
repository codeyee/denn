from .base import TMDBBaseView
from .utils import normalize_season


class VideoTvSeasonDetailView(TMDBBaseView):
    def get(self, request, tv_id, season_number):
        client = self.get_client()
        return self.handle_api_call(
            client.get_season_details,
            transformer=normalize_season,
            tv_id=int(tv_id),
            season_number=int(season_number)
        )
