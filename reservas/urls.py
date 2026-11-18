"""Rotas da API de reservas."""

from django.urls import path

from . import views, views_gestao


app_name = "reservas"

urlpatterns = [
    path("reservas/", views.MinhasReservasView.as_view(), name="minhas"),
    path("reservas/<int:pk>/", views.ReservaDetalheView.as_view(), name="detalhe"),
    path(
        "reservas/<int:pk>/cancelar/",
        views.CancelarReservaView.as_view(),
        name="cancelar",
    ),
    path(
        "gestao/reservas/",
        views_gestao.GestaoReservasView.as_view(),
        name="gestao",
    ),
    path(
        "gestao/reservas/<int:pk>/aprovar/",
        views_gestao.AprovarReservaView.as_view(),
        name="aprovar",
    ),
    path(
        "gestao/reservas/<int:pk>/rejeitar/",
        views_gestao.RejeitarReservaView.as_view(),
        name="rejeitar",
    ),
    path("gestao/ocupacao/", views_gestao.OcupacaoView.as_view(), name="ocupacao"),
]
