from secrets import randbelow

from django.http import Http404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from content.serializers import (
    DynamicCollectionItemSerializer,
    DynamicCollectionSerializer,
    DynamicCollectionSettingsSerializer,
    RandomSelectionRequestSerializer,
)
from content.services.dynamic_collections import (
    DYNAMIC_COLLECTIONS,
    collection_cover_images,
    collection_counts,
    collection_queryset,
    collection_settings,
    sync_dynamic_collections,
    get_definition,
    update_collection_settings,
)
from core.pagination import CustomPageNumberPagination


class DynamicCollectionBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_available_definition(self, request, key):
        definition = get_definition(key)
        if definition is None:
            raise Http404
        globally_enabled, enabled_by_key = collection_settings(request.user)
        if not globally_enabled or not enabled_by_key[definition.key]:
            raise Http404
        return definition


class DynamicCollectionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Dynamic Collections"],
        summary="List the current user's dynamic progress collections",
        responses={200: DynamicCollectionSerializer(many=True)},
    )
    def get(self, request):
        lists_by_key = sync_dynamic_collections(request.user)
        globally_enabled, enabled_by_key = collection_settings(request.user)
        counts = collection_counts(request.user)
        covers = collection_cover_images(request.user)
        payload = {
            "enabled": globally_enabled,
            "collections": [
                {
                    "key": definition.key,
                    "list_id": lists_by_key[definition.key].id,
                    "name": definition.name,
                    "group": definition.group,
                    "item_count": counts[definition.key],
                    "enabled": enabled_by_key[definition.key],
                    "random_enabled": definition.random_enabled,
                    "cover_images": covers[definition.key],
                }
                for definition in DYNAMIC_COLLECTIONS
            ],
        }
        return Response(payload)


class DynamicCollectionSettingsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DynamicCollectionSettingsSerializer

    @extend_schema(
        tags=["Dynamic Collections"],
        summary="Update dynamic collection visibility for the current user",
        request=DynamicCollectionSettingsSerializer,
        responses={200: DynamicCollectionSerializer(many=True)},
    )
    def patch(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        changes = [
            (change["key"], change["enabled"])
            for change in serializer.validated_data.get("collections", [])
        ]
        globally_enabled, enabled_by_key = update_collection_settings(
            request.user,
            globally_enabled=serializer.validated_data.get("enabled"),
            collection_changes=changes,
        )
        lists_by_key = sync_dynamic_collections(request.user)
        counts = collection_counts(request.user)
        covers = collection_cover_images(request.user)
        return Response(
            {
                "enabled": globally_enabled,
                "collections": [
                    {
                        "key": definition.key,
                        "list_id": lists_by_key[definition.key].id,
                        "name": definition.name,
                        "group": definition.group,
                        "item_count": counts[definition.key],
                        "enabled": enabled_by_key[definition.key],
                        "random_enabled": definition.random_enabled,
                        "cover_images": covers[definition.key],
                    }
                    for definition in DYNAMIC_COLLECTIONS
                ],
            }
        )


class DynamicCollectionItemsView(DynamicCollectionBaseView):
    pagination_class = CustomPageNumberPagination

    @extend_schema(
        tags=["Dynamic Collections"],
        summary="List the current user's items in a dynamic collection",
        parameters=[
            OpenApiParameter("q", str),
            OpenApiParameter("sort", str, enum=["recent", "title", "completed"]),
            OpenApiParameter("page", int),
            OpenApiParameter("page_size", int),
        ],
        responses={200: DynamicCollectionItemSerializer(many=True)},
    )
    def get(self, request, key):
        definition = self.get_available_definition(request, key)
        queryset = collection_queryset(
            request.user,
            definition,
            search=request.query_params.get("q", "").strip(),
        )
        ordering = {
            "title": ("content_item__browse_meta__display_title", "id"),
            "completed": ("-last_completed_at", "-id"),
        }.get(request.query_params.get("sort"), ("-updated_at", "-id"))
        queryset = queryset.order_by(*ordering)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is None:
            return Response(DynamicCollectionItemSerializer(queryset, many=True).data)
        return paginator.get_paginated_response(
            DynamicCollectionItemSerializer(page, many=True).data,
        )


class DynamicCollectionRandomView(DynamicCollectionBaseView):
    @extend_schema(
        tags=["Dynamic Collections"],
        summary="Choose a random planned item from a dynamic collection",
        request=RandomSelectionRequestSerializer,
        responses={200: DynamicCollectionItemSerializer},
    )
    def post(self, request, key):
        definition = self.get_available_definition(request, key)
        if not definition.random_enabled:
            raise Http404
        serializer = RandomSelectionRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        queryset = collection_queryset(request.user, definition)
        if definition.group == "type":
            queryset = queryset.filter(status="backlog")
        queryset = queryset.exclude(
            content_item_id__in=serializer.validated_data["exclude_content_ids"],
        )
        count = queryset.count()
        if count == 0:
            return Response({"result": None})
        tracking = queryset.order_by("id")[randbelow(count)]
        return Response({"result": DynamicCollectionItemSerializer(tracking).data})
