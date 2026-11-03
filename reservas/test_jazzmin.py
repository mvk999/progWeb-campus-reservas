"""Testes de integração do Jazzmin para a etapa C1.09."""

from datetime import datetime
from importlib.metadata import version
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.staticfiles import finders
from django.test import TestCase
from django.urls import reverse

from ambientes.models import Ambiente, CategoriaAmbiente
from reservas.models import Reserva


class JazzminIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.admin_user = user_model.objects.create_superuser(
            username="admin-jazzmin",
            email="admin-jazzmin@example.invalid",
            password="test-only-password",
        )
        cls.responsavel = user_model.objects.create_user(
            username="responsavel-jazzmin",
            password="test-only-password",
        )
        categoria = CategoriaAmbiente.objects.create(
            nome="Categoria Jazzmin",
            descricao="Categoria usada nos testes HTTP do Jazzmin.",
        )
        cls.ambiente = Ambiente.objects.create(
            codigo="JAZZ-AMB-001",
            nome="Sala Jazzmin",
            descricao="Ambiente usado nos testes HTTP do Jazzmin.",
            localizacao="Bloco de testes",
            capacidade=20,
            categoria=categoria,
            responsavel=cls.responsavel,
        )
        cls.reserva = Reserva.objects.create(
            solicitante=cls.responsavel,
            ambiente=cls.ambiente,
            inicio=datetime(2026, 11, 10, 14, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
            fim=datetime(2026, 11, 10, 15, 0, tzinfo=ZoneInfo("America/Sao_Paulo")),
            observacoes="Reserva usada nos testes HTTP do Jazzmin.",
        )

    def setUp(self):
        self.client.force_login(self.admin_user)

    def assert_jazzmin_template_used(self, response, *template_paths):
        rendered_paths = {
            tuple(Path(template.origin.name).parts[-len(template_paths[0].split("/")) :])
            for template in response.templates
            if template.origin is not None
        }
        for template_path in template_paths:
            expected_parts = tuple(template_path.split("/"))
            self.assertIn(
                expected_parts,
                rendered_paths,
                f"O template {template_path} do Jazzmin não foi renderizado.",
            )

    def test_versao_e_ordem_do_app_jazzmin(self):
        apps = list(settings.INSTALLED_APPS)

        self.assertLess(apps.index("jazzmin"), apps.index("django.contrib.admin"))
        self.assertEqual(version("django-jazzmin"), "3.0.5")

    def test_login_renderiza_template_jazzmin_com_identidade_configurada(self):
        self.client.logout()
        response = self.client.get(reverse("admin:login"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Campus Reservas")
        self.assertContains(response, "Sistema de Reservas de Ambientes e Equipamentos")
        self.assertContains(response, 'class="login-box"')
        self.assertContains(response, 'class="login-box-msg"')
        self.assert_jazzmin_template_used(
            response,
            "jazzmin/templates/admin/login.html",
            "jazzmin/templates/registration/base.html",
        )

    def test_dashboard_exibe_branding_e_opcoes_de_tema(self):
        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Campus Reservas")
        self.assertContains(response, "Administração — Campus Reservas")
        self.assertContains(response, 'id="jazzy-theme-chooser"')
        self.assertContains(response, 'id="jazzmin-mode-select"')
        for value, label in (("light", "Light"), ("dark", "Dark"), ("auto", "Auto")):
            with self.subTest(theme=value):
                self.assertContains(response, f'<option value="{value}">{label}</option>')
        self.assert_jazzmin_template_used(
            response,
            "jazzmin/templates/admin/base.html",
            "jazzmin/templates/admin/index.html",
        )

    def test_paginas_administrativas_de_ambientes_e_reservas_renderizam(self):
        pages = (
            (
                reverse("admin:ambientes_ambiente_changelist"),
                Ambiente,
                self.ambiente,
            ),
            (reverse("admin:ambientes_ambiente_add"), None, None),
            (
                reverse("admin:reservas_reserva_changelist"),
                Reserva,
                self.reserva,
            ),
        )

        for url, model, fixture in pages:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'id="jazzy-navbar"')
                self.assertContains(response, "jazzmin/css/main.css")
                if model is not None:
                    listed_ids = {obj.pk for obj in response.context["cl"].result_list}
                    self.assertIn(fixture.pk, listed_ids)
                else:
                    self.assertContains(response, 'name="codigo"')

    def test_arquivos_estaticos_jazzmin_sao_localizaveis(self):
        for asset in ("jazzmin/css/main.css", "jazzmin/js/main.js"):
            with self.subTest(asset=asset):
                asset_path = finders.find(asset)
                self.assertIsNotNone(asset_path, f"Não foi encontrado: {asset}")
                self.assertTrue(Path(asset_path).is_file())
