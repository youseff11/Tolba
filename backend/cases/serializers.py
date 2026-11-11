from rest_framework import serializers

from .models import Case, CaseItem


class CaseItemSerializer(serializers.ModelSerializer):
    added_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = CaseItem
        fields = (
            "id", "case", "kind", "ref_code", "camera", "video", "start_ts", "end_ts", "crop_url", "score",
            "match_probability", "source_query", "data", "decision", "note", "added_by", "created_at",
        )
        read_only_fields = ("case", "added_by", "created_at")

    def validate(self, attrs):
        kind = attrs.get("kind", getattr(self.instance, "kind", None))
        if kind == "note" and not (attrs.get("note") or getattr(self.instance, "note", "")):
            raise serializers.ValidationError({"note": "A note item needs text"})
        if kind in ("track", "event") and not (attrs.get("ref_code") or getattr(self.instance, "ref_code", "")):
            raise serializers.ValidationError({"ref_code": "Track/event items need a TRK-/EVT- code"})
        return attrs


class CaseSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    pending_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Case
        fields = (
            "id", "title", "description", "status", "created_by", "created_at", "updated_at",
            "items_count", "pending_count",
        )


class CaseDetailSerializer(CaseSerializer):
    items = CaseItemSerializer(many=True, read_only=True)

    class Meta(CaseSerializer.Meta):
        fields = CaseSerializer.Meta.fields + ("items",)
