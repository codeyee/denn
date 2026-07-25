from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from authentication.models import UserPublicProfile


@receiver(post_save, sender=User)
def ensure_public_profile(sender, instance, created, **kwargs):
    if created:
        UserPublicProfile.objects.get_or_create(user=instance)
