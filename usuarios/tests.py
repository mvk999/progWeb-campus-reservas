"""Testes comportamentais do usuário e da autenticação nativa."""

from io import StringIO

from django.conf import settings
from django.contrib import admin
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)
from reservas.models import BloqueioAmbiente, Reserva, ReservaEquipamento

from .models import Usuario


User = get_user_model()


class UsuarioAuthenticationTests(TestCase):
    def test_usuario_comum_e_criado_sem_privilegios_administrativos(self):
        user = User.objects.create_user(
            username="solicitante",
            password="Senha-temporaria-123!",
        )

        self.assertTrue(User.objects.filter(pk=user.pk).exists())
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_senha_e_armazenada_com_hash_e_pode_ser_conferida(self):
        raw_password = "Senha-temporaria-123!"
        user = User.objects.create_user(
            username="usuario-senha",
            password=raw_password,
        )

        self.assertNotEqual(user.password, raw_password)
        self.assertTrue(user.check_password(raw_password))
        self.assertFalse(user.check_password("senha-incorreta"))

    def test_backend_autentica_credenciais_validas_e_rejeita_invalidas(self):
        password = "Senha-temporaria-123!"
        user = User.objects.create_user(username="autenticacao", password=password)

        authenticated_user = authenticate(username="autenticacao", password=password)
        self.assertIsNotNone(authenticated_user)
        self.assertEqual(authenticated_user.pk, user.pk)
        self.assertIsNone(
            authenticate(username="autenticacao", password="senha-incorreta")
        )

        self.assertTrue(self.client.login(username="autenticacao", password=password))
        self.client.logout()
        self.assertFalse(
            self.client.login(username="autenticacao", password="senha-incorreta")
        )

    def test_create_superuser_define_flags_administrativas(self):
        superuser = User.objects.create_superuser(
            username="administrador",
            email="administrador@example.test",
            password="Senha-temporaria-123!",
        )

        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_active)
        self.assertTrue(superuser.check_password("Senha-temporaria-123!"))

    def test_configuracao_e_get_user_model_usam_usuario_customizado(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "usuarios.Usuario")
        self.assertIs(User, Usuario)

    def test_usuario_herda_associacao_nativa_com_grupos_e_permissoes(self):
        user = User.objects.create_user(username="membro-grupo")
        group = Group.objects.create(name="grupo-de-teste")
        permission = Permission.objects.get(
            content_type__app_label="usuarios",
            codename="view_usuario",
        )
        group.permissions.add(permission)
        user.groups.add(group)

        self.assertIn(group, user.groups.all())
        self.assertTrue(user.has_perm("usuarios.view_usuario"))

    def test_modelo_esta_registrado_com_user_admin_nativo(self):
        self.assertTrue(admin.site.is_registered(Usuario))
        self.assertIsInstance(admin.site.get_model_admin(Usuario), UserAdmin)

    def test_superusuario_acessa_admin_autenticado(self):
        superuser = User.objects.create_superuser(
            username="admin-site",
            password="Senha-temporaria-123!",
        )
        self.client.force_login(superuser)

        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)


class ConfigurarPerfisCommandTests(TestCase):
    domain_models = (
        CategoriaAmbiente,
        Ambiente,
        CategoriaEquipamento,
        Equipamento,
        Reserva,
        ReservaEquipamento,
        BloqueioAmbiente,
    )

    def configure_profiles(self):
        call_command("configurar_perfis", stdout=StringIO(), verbosity=0)

    def test_cria_os_tres_grupos_e_aplica_a_matriz_minima(self):
        self.configure_profiles()

        administrator = Group.objects.get(name="Administrador")
        responsible = Group.objects.get(name="Responsável")
        requester = Group.objects.get(name="Solicitante")

        expected_administrator = {
            (model._meta.app_label, f"{action}_{model._meta.model_name}")
            for model in self.domain_models
            for action in ("add", "view", "change", "delete")
        }
        actual_administrator = {
            (permission.content_type.app_label, permission.codename)
            for permission in administrator.permissions.select_related(
                "content_type"
            )
        }
        self.assertEqual(actual_administrator, expected_administrator)
        self.assertFalse(responsible.permissions.exists())
        self.assertFalse(requester.permissions.exists())

    def test_execucao_repetida_e_idempotente(self):
        self.configure_profiles()
        first = {
            group.name: set(group.permissions.values_list("pk", flat=True))
            for group in Group.objects.filter(
                name__in=("Administrador", "Responsável", "Solicitante")
            )
        }
        self.configure_profiles()
        second = {
            group.name: set(group.permissions.values_list("pk", flat=True))
            for group in Group.objects.filter(
                name__in=("Administrador", "Responsável", "Solicitante")
            )
        }

        self.assertEqual(first, second)
        self.assertEqual(
            Group.objects.filter(
                name__in=("Administrador", "Responsável", "Solicitante")
            ).count(),
            3,
        )

    def test_nao_altera_usuarios_associacoes_ou_permissoes_individuais(self):
        user = User.objects.create_user(
            username="usuario-preservado",
            is_staff=False,
            is_superuser=False,
        )
        other_group = Group.objects.create(name="grupo-manual")
        user.groups.add(other_group)
        individual_permission = Permission.objects.get(
            content_type__app_label="usuarios",
            codename="view_usuario",
        )
        user.user_permissions.add(individual_permission)

        self.configure_profiles()

        user.refresh_from_db()
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(
            set(user.groups.values_list("name", flat=True)), {"grupo-manual"}
        )
        self.assertTrue(
            user.user_permissions.filter(pk=individual_permission.pk).exists()
        )

    def test_sincroniza_permissoes_padroes_privilegiadas_e_preserva_customizadas(self):
        self.configure_profiles()
        administrator = Group.objects.get(name="Administrador")
        user_change = Permission.objects.get(
            content_type__app_label="usuarios",
            codename="change_usuario",
        )
        group_change = Permission.objects.get(
            content_type__app_label="auth",
            codename="change_group",
        )
        custom_permission = Permission.objects.create(
            content_type=ContentType.objects.get_for_model(Ambiente),
            codename="can_review_local_demo",
            name="Can review local demo",
        )
        administrator.permissions.add(user_change, group_change, custom_permission)

        self.configure_profiles()

        current = set(administrator.permissions.values_list("pk", flat=True))
        self.assertNotIn(user_change.pk, current)
        self.assertNotIn(group_change.pk, current)
        self.assertIn(custom_permission.pk, current)

    def test_grupos_nao_concedem_staff_ou_acesso_global_no_admin(self):
        self.configure_profiles()
        administrator = Group.objects.get(name="Administrador")
        responsible = Group.objects.get(name="Responsável")
        requester = Group.objects.get(name="Solicitante")
        users = (
            ("admin-grupo", administrator),
            ("responsavel-grupo", responsible),
            ("solicitante-grupo", requester),
        )
        for username, group in users:
            with self.subTest(group=group.name):
                user = User.objects.create_user(username=username)
                user.groups.add(group)
                self.assertFalse(user.is_staff)
                self.assertFalse(user.is_superuser)
                if group.name == "Administrador":
                    self.assertTrue(user.has_perm("ambientes.view_ambiente"))
                else:
                    self.assertFalse(user.has_perm("ambientes.view_ambiente"))


class ProfileAdminPermissionTests(TestCase):
    domain_models = ConfigurarPerfisCommandTests.domain_models

    @staticmethod
    def changelist_url(model):
        route = f"admin:{model._meta.app_label}_{model._meta.model_name}_changelist"
        return reverse(route)

    def setUp(self):
        call_command("configurar_perfis", stdout=StringIO(), verbosity=0)
        self.administrator_group = Group.objects.get(name="Administrador")
        self.responsible_group = Group.objects.get(name="Responsável")
        self.requester_group = Group.objects.get(name="Solicitante")

    def test_staff_no_grupo_administrador_acessa_models_de_dominio_no_admin(self):
        user = User.objects.create_user(
            username="staff-admin-grupo",
            is_staff=True,
            is_superuser=False,
        )
        user.groups.add(self.administrator_group)
        self.client.force_login(user)

        for model in self.domain_models:
            with self.subTest(model=model._meta.label):
                response = self.client.get(self.changelist_url(model))
                self.assertEqual(response.status_code, 200)

    def test_administrador_pode_criar_dado_de_dominio_no_admin(self):
        user = User.objects.create_user(
            username="staff-admin-crud",
            is_staff=True,
            is_superuser=False,
        )
        user.groups.add(self.administrator_group)
        self.client.force_login(user)

        response = self.client.post(
            reverse("admin:ambientes_categoriaambiente_add"),
            {"nome": "Categoria criada pelo grupo administrador", "descricao": ""},
        )

        self.assertEqual(response.status_code, 302, response.content.decode())
        self.assertTrue(
            CategoriaAmbiente.objects.filter(
                nome="Categoria criada pelo grupo administrador"
            ).exists()
        )

    def test_administrador_nao_pode_gerenciar_usuario_ou_grupos(self):
        user = User.objects.create_user(
            username="staff-admin-sem-credenciais",
            is_staff=True,
            is_superuser=False,
        )
        user.groups.add(self.administrator_group)
        self.client.force_login(user)

        for model in (User, Group):
            with self.subTest(model=model._meta.label):
                response = self.client.get(self.changelist_url(model))
                self.assertEqual(response.status_code, 403)

    def test_responsavel_e_solicitante_staff_nao_obtem_permissao_global(self):
        for username, group in (
            ("staff-responsavel", self.responsible_group),
            ("staff-solicitante", self.requester_group),
        ):
            user = User.objects.create_user(
                username=username,
                is_staff=True,
                is_superuser=False,
            )
            user.groups.add(group)
            self.client.force_login(user)
            for model in self.domain_models:
                with self.subTest(group=group.name, model=model._meta.label):
                    self.assertEqual(
                        self.client.get(self.changelist_url(model)).status_code,
                        403,
                    )

    def test_usuario_comum_e_staff_sem_permissao_sao_bloqueados(self):
        normal_user = User.objects.create_user(username="usuario-sem-staff")
        self.client.force_login(normal_user)
        response = self.client.get(self.changelist_url(Ambiente))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("admin:login"), response.url)

        staff = User.objects.create_user(
            username="staff-sem-grupo",
            is_staff=True,
            is_superuser=False,
        )
        self.client.force_login(staff)
        self.assertEqual(
            self.client.get(self.changelist_url(Ambiente)).status_code,
            403,
        )
