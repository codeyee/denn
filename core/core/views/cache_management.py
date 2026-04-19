from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from rest_framework.permissions import IsAdminUser
from core.cache_utils import clear_all_cache, get_cache_info
from drf_spectacular.utils import extend_schema


class CacheManagementView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(
        tags=['Admin - Cache Management'],
        summary='Get cache information',
        description='Get information about the current cache backend and usage statistics.',
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'cache_info': {'type': 'object'},
                    'message': {'type': 'string'}
                }
            }
        }
    )
    def get(self, request):
        cache_info = get_cache_info()
        return Response({
            'cache_info': cache_info,
            'message': 'Cache information retrieved successfully'
        }, status=http_status.HTTP_200_OK)


class CacheClearAllView(APIView):
    permission_classes = [IsAdminUser]

    @extend_schema(
        tags=['Admin - Cache Management'],
        summary='Clear all cache',
        description='Clear all cache entries. Use with caution as this will clear all cached data.',
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string'}
                }
            }
        }
    )
    def delete(self, request):
        clear_all_cache()
        return Response({
            'message': 'All cache entries cleared successfully'
        }, status=http_status.HTTP_200_OK)
