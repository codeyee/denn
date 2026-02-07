from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count, Subquery, OuterRef, Value
from django.db.models.functions import Coalesce
from django.db import transaction
from content.models import Rating


@receiver(post_save, sender=Rating)
def update_content_item_ratings_on_save(sender, instance, created, **kwargs):
    """
    Update cached rating statistics using database-level operations.

    This approach prevents race conditions and improves performance by:
    1. Using a single atomic UPDATE query instead of SELECT + UPDATE
    2. Leveraging Subquery to calculate aggregates at database level
    3. Avoiding N+1 queries in bulk operations

    Performance: O(1) queries regardless of number of ratings
    Thread-safe: Uses database-level aggregation
    """
    from content.models import ContentItem

    # Use atomic transaction to ensure consistency
    with transaction.atomic():
        # Update rating statistics using a single database query with subqueries
        # Use Coalesce to handle case when no ratings exist (sets count to 0, avg to NULL)
        ContentItem.objects.filter(pk=instance.content_item_id).update(
            rating_count=Coalesce(
                Subquery(
                    Rating.objects.filter(content_item=OuterRef('pk'))
                    .values('content_item')
                    .annotate(count=Count('id'))
                    .values('count')[:1]
                ),
                Value(0)  # Default to 0 if no ratings exist
            ),
            average_rating=Subquery(
                Rating.objects.filter(content_item=OuterRef('pk'))
                .values('content_item')
                .annotate(avg=Avg('score'))
                .values('avg')[:1]
            )  # NULL is acceptable for average_rating
        )


@receiver(post_delete, sender=Rating)
def update_content_item_ratings_on_delete(sender, instance, **kwargs):
    """
    Update cached rating statistics after deletion using database-level operations.

    Handles the case where all ratings might be deleted (sets count to 0 and
    NULL for average_rating when no ratings exist).

    Performance: O(1) queries regardless of number of ratings
    Thread-safe: Uses database-level aggregation
    """
    from content.models import ContentItem

    # Use atomic transaction to ensure consistency
    with transaction.atomic():
        # Update rating statistics using a single database query with subqueries
        # Use Coalesce to handle case when no ratings exist (sets count to 0, avg to NULL)
        ContentItem.objects.filter(pk=instance.content_item_id).update(
            rating_count=Coalesce(
                Subquery(
                    Rating.objects.filter(content_item=OuterRef('pk'))
                    .values('content_item')
                    .annotate(count=Count('id'))
                    .values('count')[:1]
                ),
                Value(0)  # Default to 0 if no ratings exist
            ),
            average_rating=Subquery(
                Rating.objects.filter(content_item=OuterRef('pk'))
                .values('content_item')
                .annotate(avg=Avg('score'))
                .values('avg')[:1]
            )  # NULL is acceptable for average_rating
        )
