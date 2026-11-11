"""Aggregates for the dashboard: AI events (by type / camera / time) + local platform activity."""
from collections import Counter
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from . import visionseek as vs
from .models import SearchLog, VideoRecord

CAIRO = ZoneInfo("Africa/Cairo")
BUCKETS = [60, 300, 900, 1800, 3600, 3 * 3600, 6 * 3600, 86400]  # seconds
MAX_BUCKETS = 24


def _parse(ts):
    try:
        return datetime.fromisoformat(ts)
    except (TypeError, ValueError):
        return None


def _timeline(events):
    pts = [(e, _parse(e.get("start_ts"))) for e in events]
    pts = [(e, t) for e, t in pts if t]
    if not pts:
        return {"bucket_sec": None, "buckets": []}
    lo = min(t for _, t in pts)
    hi = max(t for _, t in pts)
    span = max(1, (hi - lo).total_seconds())
    size = next((b for b in BUCKETS if span / b <= MAX_BUCKETS), BUCKETS[-1])
    start = datetime.fromtimestamp(lo.timestamp() // size * size, tz=lo.tzinfo)
    n = int((hi - start).total_seconds() // size) + 1
    buckets = [{"start": (start + timedelta(seconds=i * size)).isoformat(), "total": 0, "by_type": {}} for i in range(n)]
    for e, t in pts:
        b = buckets[int((t - start).total_seconds() // size)]
        b["total"] += 1
        b["by_type"][e["type"]] = b["by_type"].get(e["type"], 0) + 1
    return {"bucket_sec": size, "buckets": buckets}


def build(user):
    from cases.models import Case, CaseItem

    out = {"ai_error": None}
    events, cameras = [], []
    try:
        events = vs.events({"limit": 500})
        cameras = vs.list_cameras()
    except vs.VisionSeekError as exc:
        out["ai_error"] = exc.detail

    out["cameras"] = len(cameras)
    out["sites"] = len({c.get("site") for c in cameras if c.get("site")})
    out["events_total"] = len(events)
    out["events_capped"] = len(events) >= 500
    out["events_by_type"] = dict(Counter(e.get("type") for e in events))
    out["events_by_camera"] = dict(Counter(e.get("camera") for e in events).most_common(8))
    out["events_timeline"] = _timeline(events)
    out["recent_events"] = sorted(events, key=lambda e: e.get("start_ts") or "", reverse=True)[:6]

    out["videos_by_status"] = dict(Counter(VideoRecord.objects.values_list("status", flat=True)))
    out["videos_total"] = sum(out["videos_by_status"].values())
    out["cases_by_status"] = dict(Counter(Case.objects.values_list("status", flat=True)))
    out["decisions"] = dict(Counter(CaseItem.objects.exclude(kind="note").values_list("decision", flat=True)))

    today = timezone.localdate()
    first = today - timedelta(days=6)
    rows = (
        SearchLog.objects.filter(created_at__date__gte=first)
        .annotate(day=TruncDate("created_at", tzinfo=CAIRO))
        .values("day")
        .annotate(n=Count("id"))
    )
    per_day = {r["day"]: r["n"] for r in rows}
    out["searches_7d"] = [
        {"day": (first + timedelta(days=i)).isoformat(), "count": per_day.get(first + timedelta(days=i), 0)}
        for i in range(7)
    ]
    out["searches_total"] = SearchLog.objects.count()
    out["my_searches"] = SearchLog.objects.filter(user=user).count()
    return out
