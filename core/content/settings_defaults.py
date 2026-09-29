"""Serializable default providers for moderation fields.

Django migrations cannot serialize lambdas, so named functions live here and
are imported by both the settings module and the moderation model.
"""
from django.conf import settings


def current_policy_revision() -> str:
    """Return the active policy revision from settings at call time."""
    return settings.MODERATION_POLICY_REVISION
