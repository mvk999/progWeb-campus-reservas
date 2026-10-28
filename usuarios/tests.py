"""Testes comportamentais do usuário e da autenticação nativa."""

from django.conf import settings
from django.contrib import admin
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group, Permission
from django.test import TestCase
from django.urls import reverse

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
