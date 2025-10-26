from .base import IGDBBaseView
from .utils import normalize_game

class GamesGameDetailView(IGDBBaseView):
    def get(self, request, game_id):
        client = self.get_client()
        return self.handle_api_call(
            client.get_game_details,
            transformer=normalize_game,
            game_id=int(game_id)
        )

