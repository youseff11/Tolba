from django.urls import path

from . import views, zones

urlpatterns = [
    path("auth/login", views.LoginView.as_view()),
    path("auth/register", views.RegisterView.as_view()),
    path("auth/me", views.MeView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("health", views.HealthView.as_view()),
    path("dashboard", views.DashboardView.as_view()),
    path("analytics", views.AnalyticsView.as_view()),
    path("cameras", views.CamerasView.as_view()),
    path("videos", views.VideosView.as_view()),
    path("videos/sync", views.VideoSyncView.as_view()),
    path("videos/<str:code>", views.VideoDetailView.as_view()),
    path("videos/<str:code>/tracks", views.VideoTracksView.as_view()),
    path("crops/<int:track_id>/<int:rank>", views.CropView.as_view()),
    path("search", views.SearchView.as_view()),
    path("search/history", views.SearchHistoryView.as_view()),
    path("events", views.EventsView.as_view()),
    path("zones", zones.ZonesListView.as_view()),
    path("zones/export.yaml", zones.ZonesExportView.as_view()),
    path("zones/<str:camera>", zones.ZonesDetailView.as_view()),
]
