"""Testes da configuração base da API."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import path, reverse
from rest_framework.response import Response
from rest_framework.views import APIView


class RotaProtegidaDeTeste(APIView):
    """Rota que usa as permissões padrão do projeto (login obrigatório)."""

    def get(self, request):
        return Response({"username": request.user.username})


urlpatterns = [
    path("api/protegida/", RotaProtegidaDeTeste.as_view()),
]


class CsrfViewTests(TestCase):
    def test_entrega_token_e_cookie_csrf(self):
        resposta = self.client.get(reverse("usuarios:csrf"))

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta["Content-Type"], "application/json")
        self.assertIn("csrftoken", resposta.cookies)
        self.assertTrue(resposta.json()["csrfToken"])

    def test_aceita_acesso_anonimo(self):
        resposta = self.client.get(reverse("usuarios:csrf"))

        self.assertEqual(resposta.status_code, 200)


@override_settings(ROOT_URLCONF=__name__)
class AutenticacaoPadraoTests(TestCase):
    def test_anonimo_recebe_401(self):
        resposta = self.client.get("/api/protegida/")

        self.assertEqual(resposta.status_code, 401)
        self.assertEqual(resposta["WWW-Authenticate"], "Session")

    def test_usuario_logado_acessa(self):
        usuario = get_user_model().objects.create_user(username="api-logado")
        self.client.force_login(usuario)

        resposta = self.client.get("/api/protegida/")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json(), {"username": "api-logado"})
