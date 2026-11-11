"""Thin HTTP client for the VisionSeek AI REST API (see docs/API.md of the AI package).

All calls go through `_request`, which adds the X-API-Key header and turns every failure
into a `VisionSeekError(status, detail)` that the DRF exception handler returns as JSON.
"""
from __future__ import annotations

import re
import threading
import time

import requests
from django.conf import settings


class VisionSeekError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def _url(path: str) -> str:
    return f"{settings.VISIONSEEK_BASE_URL}{path}"


def _headers() -> dict:
    h = {"Accept": "application/json"}
    if settings.VISIONSEEK_API_KEY:
        h["X-API-Key"] = settings.VISIONSEEK_API_KEY
    return h


_local = threading.local()


def _sess() -> requests.Session:
    """One keep-alive session per thread: no new TLS handshake to the tunnel on every request."""
    if not hasattr(_local, "s"):
        _local.s = requests.Session()
    return _local.s


RETRY_STATUS = {502, 503, 504, 520, 521, 522, 523, 524, 530}  # tunnel / proxy hiccups


def _request(method: str, path: str, *, timeout: float | None = None, **kwargs) -> requests.Response:
    # GETs are safe to repeat: retry short tunnel drops instead of failing the page at once.
    attempts = 3 if method == "GET" else 1
    for n in range(attempts):
        last = n == attempts - 1
        try:
            resp = _sess().request(
                method, _url(path), headers=_headers(), timeout=timeout or settings.VISIONSEEK_TIMEOUT, **kwargs
            )
        except requests.Timeout:
            if not last:
                continue
            raise VisionSeekError(504, f"AI service timed out ({settings.VISIONSEEK_BASE_URL})")
        except requests.RequestException as exc:
            if not last:
                time.sleep(0.6 * (n + 1))
                continue
            raise VisionSeekError(
                502, f"AI service unreachable at {settings.VISIONSEEK_BASE_URL} ({exc.__class__.__name__})"
            )
        if resp.status_code in RETRY_STATUS and not last:
            time.sleep(0.6 * (n + 1))
            continue
        break

    if resp.status_code >= 400:
        ctype = resp.headers.get("Content-Type", "")
        if "html" in ctype or resp.text.lstrip()[:1] == "<":
            # Cloudflare / proxy error page – never show raw HTML to the user.
            title = re.search(r"<title>(.*?)</title>", resp.text, re.S | re.I)
            title = re.sub(r"\s+", " ", title.group(1)).strip() if title else resp.reason
            raise VisionSeekError(
                502,
                f"AI server is not reachable through its tunnel (HTTP {resp.status_code}: {title[:120]}). "
                "The AI machine or cloudflared is down – restart it and update VISIONSEEK_BASE_URL if the link changed.",
            )
        try:
            detail = resp.json().get("detail", resp.text)
        except ValueError:
            detail = resp.text[:300] or resp.reason
        if isinstance(detail, list):  # FastAPI validation errors
            detail = "; ".join(
                f"{'.'.join(map(str, d.get('loc', [])[1:]))}: {d.get('msg')}" for d in detail if isinstance(d, dict)
            )
        status = resp.status_code
        if status == 401:
            # A wrong key is a server configuration problem, not the browser user's session.
            status, detail = 502, "AI service rejected the API key (check VISIONSEEK_API_KEY)"
        elif status >= 500 and status != 503:
            status = 502
        raise VisionSeekError(status, str(detail))
    return resp


def _clean(params: dict) -> dict:
    return {k: v for k, v in params.items() if v not in (None, "")}


# ---- endpoints -----------------------------------------------------------------------------

def health() -> dict:
    return _request("GET", "/health", timeout=10).json()


def list_cameras() -> list:
    return _request("GET", "/api/v1/cameras").json()


def upsert_camera(data: dict) -> dict:
    return _request("POST", "/api/v1/cameras", json=_clean(data)).json()


def upload_video(camera_code: str, start_time: str, fileobj, filename: str, content_type: str) -> dict:
    return _request(
        "POST",
        "/api/v1/videos",
        data={"camera_code": camera_code, "start_time": start_time},
        files={"file": (filename, fileobj, content_type or "application/octet-stream")},
        timeout=settings.VISIONSEEK_UPLOAD_TIMEOUT,
    ).json()


def video_status(code: str) -> dict:
    return _request("GET", f"/api/v1/videos/{code}").json()


def video_tracks(code: str) -> list:
    return _request("GET", f"/api/v1/videos/{code}/tracks").json()


def crop(track_id: int, rank: int) -> tuple[bytes, str]:
    resp = _request("GET", f"/api/v1/crops/{int(track_id)}/{int(rank)}")
    return resp.content, resp.headers.get("Content-Type", "image/jpeg")


def search(params: dict) -> dict:
    return _request("GET", "/api/v1/search", params=_clean(params)).json()


def events(params: dict) -> list:
    return _request("GET", "/api/v1/events", params=_clean(params)).json()
