"""Rotas do projeto."""

from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("usuarios.urls")),
    path("api/", include("ambientes.urls")),
    path("api/", include("reservas.urls")),
]
