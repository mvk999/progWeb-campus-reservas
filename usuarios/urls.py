"""Rotas da API ligadas a usuários e autenticação."""

from django.urls import path

from . import views


app_name = "usuarios"

urlpatterns = [
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/cadastro/", views.CadastroView.as_view(), name="cadastro"),
    path("auth/me/", views.MeView.as_view(), name="me"),
]
