"""Effective AI server link + key: the row saved from the UI wins, .env is the fallback."""
from django.conf import settings


def normalize_url(url: str) -> str:
    url = (url or "").strip().rstrip("/")
    if url.endswith("/docs"):
        url = url[: -len("/docs")].rstrip("/")
    return url


def _row():
    from .models import AISettings

    try:
        return AISettings.objects.order_by("id").first()
    except Exception:  # table not migrated yet
        return None


def get() -> tuple[str, str]:
    row = _row()
    base = (row and row.base_url) or settings.VISIONSEEK_BASE_URL
    key = (row.api_key if row and row.base_url else settings.VISIONSEEK_API_KEY) or ""
    return normalize_url(base), key.strip()


def base_url() -> str:
    return get()[0]


def api_key() -> str:
    return get()[1]
