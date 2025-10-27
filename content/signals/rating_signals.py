from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg, Count
from content.models import Rating

@receiver(post_save, sender=Rating)
def update_content_item_ratings_on_save(sender, instance, created, **kwargs):
    content_item = instance.content_item

    stats = Rating.objects.filter(content_item=content_item).aggregate(
        avg_rating=Avg('score'),
        total_count=Count('id')
    )

    content_item.average_rating = stats['avg_rating']
    content_item.rating_count = stats['total_count'] or 0
    content_item.save(update_fields=['average_rating', 'rating_count'])


@receiver(post_delete, sender=Rating)
def update_content_item_ratings_on_delete(sender, instance, **kwargs):
    content_item = instance.content_item

    stats = Rating.objects.filter(content_item=content_item).aggregate(
        avg_rating=Avg('score'),
        total_count=Count('id')
    )

    content_item.average_rating = stats['avg_rating']
    content_item.rating_count = stats['total_count'] or 0
    content_item.save(update_fields=['average_rating', 'rating_count'])

