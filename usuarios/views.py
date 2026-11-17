"""Views da API de usuários e autenticação."""

from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """Cria o cookie ``csrftoken`` e devolve um token válido no corpo.

    O frontend chama esta rota antes do primeiro POST (por exemplo, o
    login) e passa a enviar o valor do cookie no cabeçalho ``X-CSRFToken``.
    O token do corpo é diferente do cookie porque o Django o embaralha a
    cada resposta, mas os dois são aceitos.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})
