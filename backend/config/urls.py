from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponseNotFound
from django.urls import include, path, re_path


def spa_index(request):
    """Serve the built React app (frontend/dist/index.html) for every non-API route."""
    index = settings.FRONTEND_DIST / "index.html"
    if not index.exists():
        return HttpResponseNotFound("Frontend not built – run `npm run build` in frontend/")
    return FileResponse(open(index, "rb"), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("cases.urls")),
]

if settings.VISIONSEEK_MOCK:
    urlpatterns.append(path("mock/", include("mockapi.urls")))

# Catch-all for client-side routes (React Router). Must stay last.
urlpatterns.append(re_path(r"^(?!api/|admin/|mock/|static/|assets/).*$", spa_index))
