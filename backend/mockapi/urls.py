from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health),
    path("api/v1/cameras", views.cameras),
    path("api/v1/videos", views.videos),
    path("api/v1/videos/<str:code>", views.video_detail),
    path("api/v1/videos/<str:code>/tracks", views.video_tracks),
    path("api/v1/crops/<int:track_id>/<int:rank>", views.crop),
    path("api/v1/search", views.search),
    path("api/v1/events", views.events),
]
