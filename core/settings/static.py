import os
from .base import BASE_DIR

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = (
    [os.path.join(BASE_DIR, "static")]
    if os.path.exists(os.path.join(BASE_DIR, "static"))
    else []
)

# Storage configuration
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
