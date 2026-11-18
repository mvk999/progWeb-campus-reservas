"""Rotas da API de ambientes e equipamentos."""

from django.urls import path

from . import views


app_name = "ambientes"

urlpatterns = [
    path("ambientes/", views.AmbienteListView.as_view(), name="lista"),
    path("ambientes/<str:code>/", views.AmbienteDetalheView.as_view(), name="detalhe"),
    path(
        "ambientes/<str:code>/disponibilidade/",
        views.DisponibilidadeView.as_view(),
        name="disponibilidade",
    ),
    path("categorias/", views.CategoriaAmbienteListView.as_view(), name="categorias"),
    path("equipamentos/", views.EquipamentoListView.as_view(), name="equipamentos"),
]
