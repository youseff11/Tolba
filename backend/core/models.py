from django.conf import settings
from django.db import models


class VideoRecord(models.Model):
    """Local index of videos uploaded through this platform (the AI API has no 'list videos')."""

    code = models.CharField(max_length=32, unique=True)
    camera_code = models.CharField(max_length=32)
    start_time = models.CharField(max_length=64, help_text="As sent to the AI API (no offset = Africa/Cairo)")
    original_name = models.CharField(max_length=255)
    size_bytes = models.BigIntegerField(default=0)
    status = models.CharField(max_length=16, default="uploaded")
    error = models.TextField(blank=True, default="")
    duration_sec = models.FloatField(null=True, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    checked_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} ({self.camera_code})"


class SearchLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    query = models.CharField(max_length=500)
    query_en = models.CharField(max_length=500, blank=True, default="")
    filters = models.JSONField(default=dict, blank=True)
    hits = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.query


class CameraZones(models.Model):
    """Zones / lines drawn in the web editor for one camera (exported to the AI server as my_zones.yaml)."""

    camera_code = models.CharField(max_length=32, unique=True)
    zones = models.JSONField(default=list, blank=True)
    lines = models.JSONField(default=list, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["camera_code"]

    def __str__(self):
        return self.camera_code
