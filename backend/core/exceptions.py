from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .visionseek import VisionSeekError


def exception_handler(exc, context):
    if isinstance(exc, VisionSeekError):
        return Response({"detail": exc.detail, "source": "ai"}, status=exc.status)
    return drf_exception_handler(exc, context)
