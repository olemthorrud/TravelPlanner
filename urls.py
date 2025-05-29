from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("KJObackend/", include("KJObackend.urls")),
    path("admin/", admin.site.urls),
]