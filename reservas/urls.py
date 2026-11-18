"""Rotas da API de reservas."""

from django.urls import path

from . import views


app_name = "reservas"

urlpatterns = [
    path("reservas/", views.MinhasReservasView.as_view(), name="minhas"),
    path("reservas/<int:pk>/", views.ReservaDetalheView.as_view(), name="detalhe"),
    path(
        "reservas/<int:pk>/cancelar/",
        views.CancelarReservaView.as_view(),
        name="cancelar",
    ),
]
