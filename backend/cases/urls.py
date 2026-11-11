from rest_framework.routers import SimpleRouter

from .views import CaseItemViewSet, CaseViewSet

router = SimpleRouter(trailing_slash=False)
router.register("cases", CaseViewSet, basename="case")
router.register("case-items", CaseItemViewSet, basename="case-item")

urlpatterns = router.urls
