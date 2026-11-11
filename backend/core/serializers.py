from django.contrib.auth.models import User
from rest_framework import serializers

from .models import SearchLog, VideoRecord

CAMERA_RE = r"^CAM-\d{2,}$"
CAMERA_MSG = {"invalid": "Camera code must look like CAM-01"}


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "is_staff")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=6, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already taken")
        return value

    def create(self, data):
        return User.objects.create_user(
            username=data["username"], password=data["password"], first_name=data.get("first_name", "")
        )


class VideoRecordSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.StringRelatedField()

    class Meta:
        model = VideoRecord
        fields = (
            "id", "code", "camera_code", "start_time", "original_name", "size_bytes", "status",
            "error", "duration_sec", "uploaded_by", "created_at", "checked_at",
        )


class SearchLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchLog
        fields = ("id", "query", "query_en", "filters", "hits", "created_at")


class CameraSerializer(serializers.Serializer):
    code = serializers.RegexField(CAMERA_RE, error_messages=CAMERA_MSG)
    name = serializers.CharField(required=False, allow_blank=True)
    site = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)


class VideoUploadSerializer(serializers.Serializer):
    camera_code = serializers.RegexField(CAMERA_RE, error_messages=CAMERA_MSG)
    start_time = serializers.CharField()
    file = serializers.FileField()
