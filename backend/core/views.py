from django.conf import settings
from django.contrib.auth import authenticate
from django.http import HttpResponse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

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
        ai = {"base_url": settings.VISIONSEEK_BASE_URL, "mock": settings.VISIONSEEK_MOCK}
        try:
            ai.update(vs.health())
            ai["reachable"] = True
        except vs.VisionSeekError as exc:
            ai.update(reachable=False, error=exc.detail)
        return Response({"backend": "ok", "ai": ai})


class AnalyticsView(APIView):
    def get(self, request):
        from .analytics import build

        return Response(build(request.user))


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


class VideoSyncView(APIView):
    """The AI API has no 'list videos': probe VID-0001..VID-N and index the ones that exist."""

    MAX_CODE = 80

    def post(self, request):
        from concurrent.futures import ThreadPoolExecutor

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
        return Response({"found": len(found), "added": added})


class VideoDetailView(APIView):
    def get(self, request, code):
        data = vs.video_status(code)
        _sync_record(code, data)
        return Response(data)


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


class SearchHistoryView(APIView):
    def get(self, request):
        return Response(SearchLogSerializer(SearchLog.objects.filter(user=request.user)[:30], many=True).data)


class EventsView(APIView):
    def get(self, request):
        return Response(vs.events({k: request.query_params.get(k) for k in EVENT_PARAMS}))
