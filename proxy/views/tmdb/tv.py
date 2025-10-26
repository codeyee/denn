from .base import TMDBBaseView
from .utils import normalize_tv

class TMDBTVDetailView(TMDBBaseView):

    def get(self, request, tv_id):
        client = self.get_client()

        return self.handle_api_call(
            client.get_tv_details,
            transformer=normalize_tv,
            tv_id=int(tv_id)
        )
