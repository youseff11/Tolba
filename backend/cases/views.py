from django.db.models import Count, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Case, CaseItem
from .report import build_report
from .serializers import CaseDetailSerializer, CaseItemSerializer, CaseSerializer


class CaseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = Case.objects.annotate(
            items_count=Count("items"),
            pending_count=Count("items", filter=Q(items__decision="pending") & ~Q(items__kind="note")),
        )
        if st := self.request.query_params.get("status"):
            qs = qs.filter(status=st)
        return qs

    def get_serializer_class(self):
        return CaseDetailSerializer if self.action == "retrieve" else CaseSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get", "post"])
    def items(self, request, pk=None):
        case = self.get_object()
        if request.method == "GET":
            return Response(CaseItemSerializer(case.items.all(), many=True).data)
        ser = CaseItemSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ref = ser.validated_data.get("ref_code")
        if ref and case.items.filter(ref_code=ref).exists():
            return Response({"detail": f"{ref} is already in this case"}, status=status.HTTP_409_CONFLICT)
        item = ser.save(case=case, added_by=request.user)
        case.save(update_fields=["updated_at"])
        return Response(CaseItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def report(self, request, pk=None):
        case = self.get_object()
        data = build_report(case)
        data["items"] = CaseItemSerializer(case.items.all(), many=True).data
        return Response(data)


class CaseItemViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin,
                      viewsets.GenericViewSet):
    queryset = CaseItem.objects.select_related("case")
    serializer_class = CaseItemSerializer

    def perform_update(self, serializer):
        item = serializer.save()
        item.case.save(update_fields=["updated_at"])
