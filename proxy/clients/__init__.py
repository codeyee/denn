"""
Clientes de API para proxies externos.
"""

from .base import BaseAPIClient
from .tmdb import TMDBClient

__all__ = ['BaseAPIClient', 'TMDBClient']

