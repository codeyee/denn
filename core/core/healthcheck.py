import os
import re

from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET

_SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")


def healthcheck(request):
    return JsonResponse({
        "status": "HEALTHY",
        "service": "Denn API",
        "version": "1.0.0"
    })


@require_GET
@never_cache
def release_version(request):
    """Expose the deployed release sha so CI can verify a Core rollout."""
    sha = os.environ.get("BUILD_SHA", "").strip().lower()
    response = JsonResponse({
        "service": "core",
        "sha": sha if _SHA_PATTERN.match(sha) else None,
    })
    response["Cache-Control"] = "no-store"
    return response
