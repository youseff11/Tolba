from django.conf import settings
from django.contrib.auth import authenticate
from django.http import HttpResponse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import aiconfig
from . import visionseek as vs
from .models import SearchLog, VideoRecord
from .serializers import (
    CameraSerializer,
    RegisterSerializer,
    SearchLogSerializer,
    UserSerializer,
    VideoRecordSerializer,
    VideoUploadSerializer,
)

# ---------------------------------------------------------------- auth


def _token_response(user, code=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data}, status=code)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(username=request.data.get("username", ""), password=request.data.get("password", ""))
        if not user:
            return Response({"detail": "Wrong username or password"}, status=status.HTTP_400_BAD_REQUEST)
        return _token_response(user)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return _token_response(ser.save(), status.HTTP_201_CREATED)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- system


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        ai = {"base_url": aiconfig.base_url(), "mock": settings.VISIONSEEK_MOCK}
        if aiconfig.browser_direct():
            # The browser checks the AI server itself; this host may not be able to reach it.
            return Response({"backend": "ok", "ai": {**ai, "direct": True}})
        try:
            ai.update(vs.health())
            ai["reachable"] = True
        except vs.VisionSeekError as exc:
            ai.update(reachable=False, error=exc.detail)
        return Response({"backend": "ok", "ai": ai})


class AISettingsView(APIView):
    """Admins change the AI server link / key from the UI (no redeploy when the tunnel URL changes)."""

    permission_classes = [IsAdminUser]

    def _out(self):
        from .models import AISettings

        row = AISettings.objects.order_by("id").first()
        base, key = aiconfig.get()
        return {
            "base_url": base,
            "has_key": bool(key),
            "key_hint": f"…{key[-4:]}" if len(key) > 8 else ("••••" if key else ""),
            "source": "ui" if row and row.base_url else "env",
            "browser_direct": bool(row and row.browser_direct),
        }

    def get(self, request):
        return Response(self._out())

    def put(self, request):
        from .models import AISettings

        url = aiconfig.normalize_url(request.data.get("base_url", ""))
        if not url.startswith(("http://", "https://")):
            return Response({"detail": "Link must start with http:// or https://"}, status=status.HTTP_400_BAD_REQUEST)
        row = AISettings.objects.order_by("id").first() or AISettings()
        if not row.base_url:  # first save from the UI: keep the .env key unless a new one is given
            row.api_key = aiconfig.api_key()
        row.base_url = url
        if "api_key" in request.data and request.data.get("api_key") is not None:
            row.api_key = str(request.data["api_key"]).strip()
        if "browser_direct" in request.data:
            row.browser_direct = bool(request.data["browser_direct"])
        row.save()
        out = self._out()
        if row.browser_direct:
            return Response(out)  # the browser runs the connection test itself
        try:
            vs.health()
            out["reachable"] = True
        except vs.VisionSeekError as exc:
            out.update(reachable=False, error=exc.detail)
        return Response(out)


class AIConfigView(APIView):
    """What the browser needs to call the AI server directly (only when direct mode is on)."""

    def get(self, request):
        if not aiconfig.browser_direct():
            return Response({"direct": False})
        base, key = aiconfig.get()
        return Response({"direct": True, "base_url": base, "api_key": key})


class AnalyticsView(APIView):
    def get(self, request):
        from .analytics import build

        return Response(build(request.user))

    def post(self, request):
        """Direct mode: the browser fetched events + cameras from the AI and sends them here."""
        from .analytics import build

        ev, cams = request.data.get("events"), request.data.get("cameras")
        return Response(
            build(
                request.user,
                events=ev if isinstance(ev, list) else [],
                cameras=cams if isinstance(cams, list) else [],
                ai_error=request.data.get("ai_error") or None,
            )
        )


class DashboardView(APIView):
    def get(self, request):
        from cases.models import Case

        return Response(
            {
                "videos": VideoRecord.objects.count(),
                "videos_processing": VideoRecord.objects.filter(status__in=["uploaded", "processing"]).count(),
                "videos_failed": VideoRecord.objects.filter(status="failed").count(),
                "cases_open": Case.objects.filter(status="open").count(),
                "cases_total": Case.objects.count(),
                "recent_videos": VideoRecordSerializer(VideoRecord.objects.all()[:5], many=True).data,
                "recent_searches": SearchLogSerializer(SearchLog.objects.all()[:8], many=True).data,
            }
        )


# ---------------------------------------------------------------- cameras


class CamerasView(APIView):
    def get(self, request):
        return Response(vs.list_cameras())

    def post(self, request):
        ser = CameraSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return Response(vs.upsert_camera(ser.validated_data), status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------- videos


def _sync_record(code: str, data: dict):
    VideoRecord.objects.filter(code=code).update(
        status=data.get("status", "uploaded"),
        error=data.get("error") or "",
        duration_sec=data.get("duration_sec"),
    )


class VideosView(APIView):
    def get(self, request):
        qs = VideoRecord.objects.all()
        if cam := request.query_params.get("camera"):
            qs = qs.filter(camera_code=cam)
        return Response(VideoRecordSerializer(qs, many=True).data)

    def post(self, request):
        ser = VideoUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        f = ser.validated_data["file"]
        f.seek(0)
        result = vs.upload_video(
            ser.validated_data["camera_code"], ser.validated_data["start_time"], f, f.name, f.content_type
        )
        rec, _ = VideoRecord.objects.update_or_create(
            code=result["video_code"],
            defaults=dict(
                camera_code=ser.validated_data["camera_code"],
                start_time=ser.validated_data["start_time"],
                original_name=f.name,
                size_bytes=f.size,
                status=result.get("status", "uploaded"),
                uploaded_by=request.user,
            ),
        )
        return Response({**result, "record": VideoRecordSerializer(rec).data}, status=status.HTTP_202_ACCEPTED)


class VideoRecordView(APIView):
    """Direct mode: the browser uploaded the video to the AI itself; index it here."""

    def post(self, request):
        d = request.data
        code = str(d.get("video_code") or "").strip()
        if not code:
            return Response({"detail": "video_code is required"}, status=status.HTTP_400_BAD_REQUEST)
        rec, _ = VideoRecord.objects.update_or_create(
            code=code[:32],
            defaults=dict(
                camera_code=str(d.get("camera_code") or "")[:32],
                start_time=str(d.get("start_time") or "")[:64],
                original_name=str(d.get("original_name") or "")[:255],
                size_bytes=int(d.get("size_bytes") or 0),
                status=str(d.get("status") or "uploaded")[:16],
                uploaded_by=request.user,
            ),
        )
        return Response(VideoRecordSerializer(rec).data, status=status.HTTP_201_CREATED)


class VideoSyncView(APIView):
    """The AI API has no 'list videos': probe VID-0001..VID-N and index the ones that exist."""

    MAX_CODE = 80

    def post(self, request):
        from concurrent.futures import ThreadPoolExecutor

        if isinstance(request.data.get("videos"), list):  # direct mode: the browser probed the AI
            found = [(str(v["code"]), v) for v in request.data["videos"] if isinstance(v, dict) and v.get("code")]
            return Response(self._store(found))

        def probe(n):
            code = f"VID-{n:04d}"
            try:
                return code, vs.video_status(code)
            except vs.VisionSeekError as exc:
                if exc.status == 404:
                    return code, None
                raise

        with ThreadPoolExecutor(max_workers=8) as pool:
            found = [(c, d) for c, d in pool.map(probe, range(1, self.MAX_CODE + 1)) if d]
        return Response(self._store(found))

    @staticmethod
    def _store(found):
        added = 0
        for code, d in found:
            _, created = VideoRecord.objects.update_or_create(
                code=code,
                defaults=dict(
                    camera_code=d.get("camera") or "",
                    start_time=d.get("start_time") or "",
                    status=d.get("status", "done"),
                    error=d.get("error") or "",
                    duration_sec=d.get("duration_sec"),
                ),
            )
            added += created
        return {"found": len(found), "added": added}


class VideoDetailView(APIView):
    def get(self, request, code):
        data = vs.video_status(code)
        _sync_record(code, data)
        return Response(data)

    def post(self, request, code):
        """Direct mode: the browser read the status from the AI; keep the local index in step."""
        _sync_record(code, request.data if isinstance(request.data, dict) else {})
        return Response(status=status.HTTP_204_NO_CONTENT)


class VideoTracksView(APIView):
    def get(self, request, code):
        return Response(vs.video_tracks(code))


class CropView(APIView):
    def get(self, request, track_id, rank):
        content, ctype = vs.crop(track_id, rank)
        resp = HttpResponse(content, content_type=ctype)
        # Crop ids are only unique inside one AI database (mock / real / rebuilt), so never let the
        # browser cache them by URL; the frontend keeps its own per-session cache.
        resp["Cache-Control"] = "no-store"
        return resp


# ---------------------------------------------------------------- search & events

SEARCH_PARAMS = ("q", "camera", "site", "cls", "start", "end", "limit", "min_prob")
EVENT_PARAMS = ("site", "camera", "type", "name", "start", "end", "limit")


class SearchView(APIView):
    def get(self, request):
        params = {k: request.query_params.get(k) for k in SEARCH_PARAMS}
        if not (params.get("q") or "").strip():
            return Response({"detail": "q is required"}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        data = vs.search(params)
        SearchLog.objects.create(
            user=request.user,
            query=params["q"][:500],
            query_en=(data.get("query_en") or "")[:500],
            filters={k: v for k, v in params.items() if v and k != "q"},
            hits=len(data.get("hits", [])),
        )
        return Response(data)


class SearchLogView(APIView):
    """Direct mode: the browser ran the search on the AI; record it for history / analytics."""

    def post(self, request):
        d = request.data
        q = str(d.get("q") or "").strip()
        if not q:
            return Response({"detail": "q is required"}, status=status.HTTP_400_BAD_REQUEST)
        filters = d.get("filters") if isinstance(d.get("filters"), dict) else {}
        SearchLog.objects.create(
            user=request.user, query=q[:500], query_en=str(d.get("query_en") or "")[:500],
            filters=filters, hits=int(d.get("hits") or 0),
        )
        return Response(status=status.HTTP_201_CREATED)


class SearchHistoryView(APIView):
    def get(self, request):
        return Response(SearchLogSerializer(SearchLog.objects.filter(user=request.user)[:30], many=True).data)


class EventsView(APIView):
    def get(self, request):
        return Response(vs.events({k: request.query_params.get(k) for k in EVENT_PARAMS}))
