"""Views da API de usuários e autenticação."""

from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CadastroSerializer, LoginSerializer, UsuarioSerializer


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


# O DRF só confere o CSRF de usuários já autenticados. Login e cadastro são
# feitos por visitantes, então a verificação é ligada explicitamente.
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        usuario = serializer.validated_data["usuario"]
        login(request, usuario)
        return Response(UsuarioSerializer(usuario).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class CadastroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CadastroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        # Quem acabou de se cadastrar já entra no sistema.
        login(request, usuario)
        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)
