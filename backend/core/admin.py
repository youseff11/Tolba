from django.contrib import admin

from .models import SearchLog, VideoRecord


@admin.register(VideoRecord)
class VideoRecordAdmin(admin.ModelAdmin):
    list_display = ("code", "camera_code", "start_time", "status", "uploaded_by", "created_at")
    list_filter = ("status", "camera_code")
    search_fields = ("code", "original_name")


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ("query", "query_en", "hits", "user", "created_at")
    search_fields = ("query", "query_en")
