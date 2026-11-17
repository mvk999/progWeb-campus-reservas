"""Rotas da API ligadas a usuários e autenticação."""

from django.urls import path

from . import views


app_name = "usuarios"

urlpatterns = [
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
]
