"""Testes dos endpoints de autenticação da API."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import Client, TestCase
from django.urls import reverse

from ambientes.models import Ambiente, CategoriaAmbiente

from .perfis import ADMINISTRADOR, RESPONSAVEL, SOLICITANTE


Usuario = get_user_model()
SENHA = "Campus-Reservas-2026"


class AuthTestMixin:
    def post_json(self, nome_rota, dados=None, client=None, **extra):
        client = client or self.client
        return client.post(
            reverse(nome_rota),
            dados or {},
            content_type="application/json",
            **extra,
        )


class LoginTests(AuthTestMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = Usuario.objects.create_user(
            username="maria", password=SENHA, first_name="Maria"
        )

    def test_login_valido_abre_sessao_e_devolve_usuario(self):
        resposta = self.post_json(
            "usuarios:login", {"username": "maria", "password": SENHA}
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["username"], "maria")
        self.assertEqual(resposta.json()["profile"], "solicitante")
        self.assertNotIn("password", resposta.json())
        self.assertEqual(
            int(self.client.session["_auth_user_id"]), self.usuario.pk
        )

    def test_credenciais_invalidas_tem_a_mesma_mensagem(self):
        casos = {
            "senha errada": {"username": "maria", "password": "errada"},
            "usuario inexistente": {"username": "ninguem", "password": SENHA},
        }
        for caso, dados in casos.items():
            with self.subTest(caso):
                resposta = self.post_json("usuarios:login", dados)

                self.assertEqual(resposta.status_code, 400)
                self.assertEqual(
                    resposta.json(),
                    {"non_field_errors": ["Usuário ou senha inválidos."]},
                )
                self.assertNotIn("_auth_user_id", self.client.session)

    def test_usuario_inativo_nao_entra(self):
        self.usuario.is_active = False
        self.usuario.save()

        resposta = self.post_json(
            "usuarios:login", {"username": "maria", "password": SENHA}
        )

        self.assertEqual(resposta.status_code, 400)

    def test_campos_obrigatorios(self):
        resposta = self.post_json("usuarios:login", {})

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(set(resposta.json()), {"username", "password"})

    def test_aceita_apenas_post(self):
        resposta = self.client.get(reverse("usuarios:login"))

        self.assertEqual(resposta.status_code, 405)


class CsrfAutenticacaoTests(AuthTestMixin, TestCase):
    """O cliente de testes ignora o CSRF por padrão; aqui ele é aplicado."""

    @classmethod
    def setUpTestData(cls):
        Usuario.objects.create_user(username="maria", password=SENHA)

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)

    def token(self):
        self.client.get(reverse("usuarios:csrf"))
        return self.client.cookies["csrftoken"].value

    def test_login_sem_token_csrf_e_recusado(self):
        resposta = self.post_json(
            "usuarios:login", {"username": "maria", "password": SENHA}
        )

        self.assertEqual(resposta.status_code, 403)

    def test_login_com_token_csrf_funciona(self):
        resposta = self.post_json(
            "usuarios:login",
            {"username": "maria", "password": SENHA},
            HTTP_X_CSRFTOKEN=self.token(),
        )

        self.assertEqual(resposta.status_code, 200)

    def test_cadastro_sem_token_csrf_e_recusado(self):
        resposta = self.post_json("usuarios:cadastro", {"username": "novo"})

        self.assertEqual(resposta.status_code, 403)

    def test_logout_sem_token_csrf_e_recusado(self):
        self.client.force_login(Usuario.objects.get(username="maria"))

        resposta = self.post_json("usuarios:logout")

        self.assertEqual(resposta.status_code, 403)
        self.assertIn("_auth_user_id", self.client.session)


class LogoutTests(AuthTestMixin, TestCase):
    def test_logout_encerra_a_sessao(self):
        usuario = Usuario.objects.create_user(username="maria", password=SENHA)
        self.client.force_login(usuario)

        resposta = self.post_json("usuarios:logout")

        self.assertEqual(resposta.status_code, 204)
        self.assertEqual(self.client.get(reverse("usuarios:me")).status_code, 401)

    def test_logout_sem_login_responde_401(self):
        resposta = self.post_json("usuarios:logout")

        self.assertEqual(resposta.status_code, 401)


class CadastroTests(AuthTestMixin, TestCase):
    def dados(self, **alteracoes):
        dados = {
            "username": "joana",
            "email": "joana@ufla.br",
            "firstName": "Joana",
            "lastName": "Pereira",
            "password": SENHA,
            "passwordConfirmation": SENHA,
        }
        dados.update(alteracoes)
        return dados

    def test_cadastro_cria_solicitante_ja_autenticado(self):
        resposta = self.post_json("usuarios:cadastro", self.dados())

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(
            resposta.json(),
            {
                "id": resposta.json()["id"],
                "username": "joana",
                "firstName": "Joana",
                "lastName": "Pereira",
                "email": "joana@ufla.br",
                "profile": "solicitante",
            },
        )
        usuario = Usuario.objects.get(username="joana")
        self.assertTrue(usuario.check_password(SENHA))
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertEqual(
            list(usuario.groups.values_list("name", flat=True)), [SOLICITANTE]
        )
        self.assertEqual(self.client.get(reverse("usuarios:me")).status_code, 200)

    def test_nao_aceita_campos_de_privilegio(self):
        resposta = self.post_json(
            "usuarios:cadastro",
            self.dados(is_staff=True, is_superuser=True, profile="administrador"),
        )

        self.assertEqual(resposta.status_code, 201)
        usuario = Usuario.objects.get(username="joana")
        self.assertFalse(usuario.is_staff)
        self.assertFalse(usuario.is_superuser)
        self.assertEqual(resposta.json()["profile"], "solicitante")

    def test_senhas_diferentes(self):
        resposta = self.post_json(
            "usuarios:cadastro", self.dados(passwordConfirmation="Outra-Senha-2026")
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("passwordConfirmation", resposta.json())
        self.assertFalse(Usuario.objects.filter(username="joana").exists())

    def test_aplica_regras_de_senha_do_django(self):
        for senha in ("123", "12345678", "joana123"):
            with self.subTest(senha=senha):
                resposta = self.post_json(
                    "usuarios:cadastro",
                    self.dados(password=senha, passwordConfirmation=senha),
                )

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("password", resposta.json())

    def test_nome_de_usuario_repetido_ignorando_maiusculas(self):
        Usuario.objects.create_user(username="Joana")

        resposta = self.post_json("usuarios:cadastro", self.dados())

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("username", resposta.json())

    def test_email_repetido_ignorando_maiusculas(self):
        Usuario.objects.create_user(username="outra", email="Joana@UFLA.br")

        resposta = self.post_json("usuarios:cadastro", self.dados())

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("email", resposta.json())

    def test_campos_obrigatorios_e_email_valido(self):
        resposta = self.post_json("usuarios:cadastro", {"email": "invalido"})

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(
            set(resposta.json()),
            {
                "username",
                "email",
                "firstName",
                "lastName",
                "password",
                "passwordConfirmation",
            },
        )

    def test_nome_de_usuario_com_caracteres_invalidos(self):
        resposta = self.post_json("usuarios:cadastro", self.dados(username="jo ana!"))

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("username", resposta.json())


class MeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = Usuario.objects.create_user(username="maria")

    def perfil(self, usuario):
        self.client.force_login(usuario)
        resposta = self.client.get(reverse("usuarios:me"))
        self.assertEqual(resposta.status_code, 200)
        return resposta.json()["profile"]

    def test_anonimo_recebe_401(self):
        resposta = self.client.get(reverse("usuarios:me"))

        self.assertEqual(resposta.status_code, 401)

    def test_usuario_sem_grupo_e_solicitante(self):
        self.assertEqual(self.perfil(self.usuario), "solicitante")

    def test_grupo_responsavel(self):
        self.usuario.groups.add(Group.objects.create(name=RESPONSAVEL))

        self.assertEqual(self.perfil(self.usuario), "responsavel")

    def test_responsavel_por_ambiente_sem_grupo(self):
        Ambiente.objects.create(
            codigo="ME-001",
            nome="Sala",
            localizacao="Bloco M",
            capacidade=10,
            categoria=CategoriaAmbiente.objects.create(nome="Salas me"),
            responsavel=self.usuario,
        )

        self.assertEqual(self.perfil(self.usuario), "responsavel")

    def test_administrador_prevalece_sobre_responsavel(self):
        self.usuario.groups.add(
            Group.objects.create(name=RESPONSAVEL),
            Group.objects.create(name=ADMINISTRADOR),
        )

        self.assertEqual(self.perfil(self.usuario), "administrador")

    def test_superusuario_e_administrador(self):
        superusuario = Usuario.objects.create_superuser(username="root")

        self.assertEqual(self.perfil(superusuario), "administrador")
