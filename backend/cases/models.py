from django.conf import settings
from django.db import models


class Case(models.Model):
    STATUS = [("open", "Open"), ("closed", "Closed")]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS, default="open")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class CaseItem(models.Model):
    """One piece of evidence in a case: a search hit / track, an event, or a free note.

    `data` keeps a snapshot of what the AI API returned, so the case stays readable even if
    the AI database is re-built.
    """

    KIND = [("track", "Track"), ("event", "Event"), ("note", "Note")]
    DECISION = [("pending", "Pending review"), ("confirmed", "Confirmed"), ("rejected", "Rejected")]

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="items")
    kind = models.CharField(max_length=10, choices=KIND)
    ref_code = models.CharField(max_length=40, blank=True, default="", help_text="TRK-... or EVT-...")
    camera = models.CharField(max_length=32, blank=True, default="")
    video = models.CharField(max_length=32, blank=True, default="")
    start_ts = models.DateTimeField(null=True, blank=True)
    end_ts = models.DateTimeField(null=True, blank=True)
    crop_url = models.CharField(max_length=200, blank=True, default="", help_text="AI path /api/v1/crops/<id>/<rank>")
    score = models.FloatField(null=True, blank=True)
    match_probability = models.FloatField(null=True, blank=True)
    source_query = models.CharField(max_length=500, blank=True, default="")
    data = models.JSONField(default=dict, blank=True)
    decision = models.CharField(max_length=10, choices=DECISION, default="pending")
    note = models.TextField(blank=True, default="")
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = [models.F("start_ts").asc(nulls_last=True), "created_at"]

    def __str__(self):
        return f"{self.case_id}:{self.kind}:{self.ref_code or self.pk}"
