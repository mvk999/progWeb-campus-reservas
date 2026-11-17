"""Autenticação da API."""

from rest_framework import authentication


class SessionAuthentication(authentication.SessionAuthentication):
    """Autenticação por sessão que responde 401 a quem não está logado.

    O DRF só responde 401 quando a classe de autenticação informa um
    cabeçalho ``WWW-Authenticate``; sem ele, a resposta é 403. O frontend
    usa o 401 para saber que precisa redirecionar para o login, e reserva o
    403 para "logado, mas sem permissão".
    """

    def authenticate_header(self, request):
        return "Session"
