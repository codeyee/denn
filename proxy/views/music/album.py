from .base import SpotifyBaseView
from .utils import normalize_album

class MusicAlbumDetailView(SpotifyBaseView):
    def get(self, request, album_id: str):
        client = self.get_client()
        return self.handle_api_call(
            client.get_album,
            transformer=normalize_album,
            album_id=album_id
        )

