from django.contrib import admin

from content.models import Author, ContentItemAuthor, TrackAuthor


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug']
    search_fields = ['name']


@admin.register(ContentItemAuthor)
class ContentItemAuthorAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'author', 'role', 'position']
    list_filter = ['role']
    raw_id_fields = ['content_item', 'author']


@admin.register(TrackAuthor)
class TrackAuthorAdmin(admin.ModelAdmin):
    list_display = ['id', 'track', 'author', 'role', 'position']
    list_filter = ['role']
    raw_id_fields = ['track', 'author']
