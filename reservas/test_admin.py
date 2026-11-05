"""Testes HTTP do Django Admin para C1.08."""

from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group, Permission
from django.test import TestCase
from django.urls import reverse
from django.utils import formats, timezone

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)
from reservas.models import BloqueioAmbiente, Reserva, ReservaEquipamento


User = get_user_model()
ADMIN_MODELS = (
    CategoriaAmbiente,
    Ambiente,
    CategoriaEquipamento,
    Equipamento,
    Reserva,
    ReservaEquipamento,
    BloqueioAmbiente,
    User,
)
SAO_PAULO = ZoneInfo("America/Sao_Paulo")
INICIO_BASE = datetime(2026, 11, 10, 10, 0, tzinfo=SAO_PAULO)
FIM_BASE = datetime(2026, 11, 10, 11, 0, tzinfo=SAO_PAULO)


class DjangoAdminHTTPTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_superuser(
            username="admin-http",
            email="admin-http@example.invalid",
            password="test-only-password",
        )
        cls.solicitante = User.objects.create_user(
            username="solicitante-http",
            password="test-only-password",
        )
        cls.responsavel = User.objects.create_user(
            username="responsavel-http",
            password="test-only-password",
        )
        cls.criador_bloqueio = User.objects.create_user(
            username="criador-bloqueio-http",
            password="test-only-password",
        )
        cls.staff_sem_permissao = User.objects.create_user(
            username="staff-sem-permissao",
            password="test-only-password",
            is_staff=True,
        )

        cls.categoria_ambiente = CategoriaAmbiente.objects.create(
            nome="Categoria ambiente HTTP"
        )
        cls.ambiente = Ambiente.objects.create(
            codigo="HTTP-AMB-001",
            nome="Sala HTTP",
            descricao="Ambiente usado nos testes do Admin.",
            localizacao="Bloco HTTP",
            capacidade=24,
            categoria=cls.categoria_ambiente,
            responsavel=cls.responsavel,
        )
        cls.categoria_equipamento = CategoriaEquipamento.objects.create(
            nome="Categoria equipamento HTTP"
        )
        cls.equipamento = Equipamento.objects.create(
            codigo="HTTP-EQP-001",
            nome="Projetor HTTP",
            quantidade_total=4,
            categoria=cls.categoria_equipamento,
        )
        cls.reserva = Reserva.objects.create(
            solicitante=cls.solicitante,
            ambiente=cls.ambiente,
            inicio=INICIO_BASE,
            fim=FIM_BASE,
            observacoes="Reserva usada nos testes do Admin.",
        )
        cls.item_reserva = ReservaEquipamento.objects.create(
            reserva=cls.reserva,
            equipamento=cls.equipamento,
            quantidade=2,
        )
        cls.bloqueio = BloqueioAmbiente.objects.create(
            ambiente=cls.ambiente,
            inicio=INICIO_BASE + timedelta(days=2),
            fim=FIM_BASE + timedelta(days=2),
            motivo="Bloqueio usado nos testes do Admin.",
            criado_por=cls.criador_bloqueio,
        )

    def setUp(self):
        self.client.force_login(self.admin_user)

    @staticmethod
    def admin_url(model, action, object_id=None):
        opts = model._meta
        name = f"admin:{opts.app_label}_{opts.model_name}_{action}"
        args = [object_id] if object_id is not None else []
        return reverse(name, args=args)

    @staticmethod
    def datetime_post_data(field_name, value):
        date_format = formats.get_format("DATE_INPUT_FORMATS")[0]
        time_format = formats.get_format("TIME_INPUT_FORMATS")[0]
        return {
            f"{field_name}_0": value.strftime(date_format),
            f"{field_name}_1": value.strftime(time_format),
        }

    @staticmethod
    def inline_management_data(response):
        inline_formset = response.context["inline_admin_formsets"][0].formset
        data = {
            f"{inline_formset.prefix}-{name}": str(value)
            for name, value in inline_formset.management_form.initial.items()
        }
        for index, form in enumerate(inline_formset.initial_forms):
            for field_name in form.fields:
                value = form[field_name].value()
                if value is not None:
                    field_key = f"{inline_formset.prefix}-{index}-{field_name}"
                    data[field_key] = str(value)
        return data

    def assert_denied_or_login_page(self, response):
        self.assertIn(response.status_code, (200, 302, 403))
        if response.status_code == 302:
            self.assertTrue(response.url.startswith(reverse("admin:login")))
        elif response.status_code == 200:
            self.assertContains(response, 'id="login-form"')
            self.assertIs(response.context["has_permission"], False)

    def assert_admin_post_invalid(self, model, data, field=None):
        count_before = model.objects.count()
        response = self.client.post(self.admin_url(model, "add"), data)

        self.assertEqual(response.status_code, 200)
        form = response.context["adminform"].form
        self.assertTrue(form.errors)
        if field:
            self.assertIn(field, form.errors)
        self.assertEqual(model.objects.count(), count_before)
        return response

    def test_todos_os_models_estao_registrados_incluindo_useradmin(self):
        for model in ADMIN_MODELS:
            with self.subTest(model=model.__name__):
                self.assertTrue(admin.site.is_registered(model))

        self.assertIsInstance(admin.site.get_model_admin(User), UserAdmin)

    def test_superuser_acessa_changelist_e_add_de_todos_os_models(self):
        fixtures = {
            CategoriaAmbiente: self.categoria_ambiente,
            Ambiente: self.ambiente,
            CategoriaEquipamento: self.categoria_equipamento,
            Equipamento: self.equipamento,
            Reserva: self.reserva,
            ReservaEquipamento: self.item_reserva,
            BloqueioAmbiente: self.bloqueio,
            User: self.admin_user,
        }
        for model in ADMIN_MODELS:
            for action in ("changelist", "add"):
                with self.subTest(model=model.__name__, action=action):
                    response = self.client.get(self.admin_url(model, action))
                    self.assertEqual(response.status_code, 200)
                    if action == "changelist":
                        result_ids = {
                            obj.pk for obj in response.context["cl"].result_list
                        }
                        self.assertIn(fixtures[model].pk, result_ids)

    def test_anonymous_e_negado_em_urls_diretas_de_changelist_e_add(self):
        self.client.logout()

        for model in ADMIN_MODELS:
            for action in ("changelist", "add"):
                with self.subTest(model=model.__name__, action=action):
                    response = self.client.get(self.admin_url(model, action))
                    self.assert_denied_or_login_page(response)

    def test_usuario_sem_staff_e_negado_em_urls_diretas_de_changelist_e_add(self):
        self.client.force_login(self.solicitante)

        for model in ADMIN_MODELS:
            for action in ("changelist", "add"):
                with self.subTest(model=model.__name__, action=action):
                    response = self.client.get(self.admin_url(model, action))
                    self.assert_denied_or_login_page(response)

    def test_staff_sem_permissoes_recebe_403_em_urls_diretas(self):
        self.client.force_login(self.staff_sem_permissao)

        for model in ADMIN_MODELS:
            for action in ("changelist", "add"):
                with self.subTest(model=model.__name__, action=action):
                    response = self.client.get(self.admin_url(model, action))
                    self.assertEqual(response.status_code, 403)

    def test_staff_com_permissao_apenas_de_visualizacao_nao_edita_modelo(self):
        from django.contrib.auth.models import Permission

        permissao_visualizacao = Permission.objects.get(
            content_type__app_label="ambientes",
            codename="view_categoriaambiente",
        )
        self.staff_sem_permissao.user_permissions.add(permissao_visualizacao)
        self.client.force_login(self.staff_sem_permissao)

        self.assertEqual(
            self.client.get(self.admin_url(CategoriaAmbiente, "changelist")).status_code,
            200,
        )
        self.assertEqual(
            self.client.get(self.admin_url(CategoriaAmbiente, "add")).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                self.admin_url(CategoriaAmbiente, "change", self.categoria_ambiente.pk),
                {"nome": "Alteração sem permissão"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                self.admin_url(CategoriaAmbiente, "delete", self.categoria_ambiente.pk),
                {"post": "yes"},
            ).status_code,
            403,
        )
        self.categoria_ambiente.refresh_from_db()
        self.assertEqual(self.categoria_ambiente.nome, "Categoria ambiente HTTP")

    def test_useradmin_cria_usuario_com_senha_segura(self):
        dados = {
            "username": "usuario-criado-no-admin",
            "password1": "senha-de-teste-segura-123",
            "password2": "senha-de-teste-segura-123",
        }
        resposta = self.client.post(self.admin_url(User, "add"), dados)

        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        usuario = User.objects.get(username=dados["username"])
        self.assertTrue(usuario.check_password(dados["password1"]))
        self.assertNotEqual(usuario.password, dados["password1"])

    def test_categoria_ambiente_pode_ser_criada_e_editada_por_post(self):
        model = CategoriaAmbiente
        dados = {"nome": "Categoria criada pelo Admin", "descricao": "Inicial"}
        resposta = self.client.post(self.admin_url(model, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        categoria = model.objects.get(nome=dados["nome"])

        dados["descricao"] = "Descrição atualizada pelo Admin"
        resposta = self.client.post(
            self.admin_url(model, "change", categoria.pk), dados
        )
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        categoria.refresh_from_db()
        self.assertEqual(categoria.descricao, dados["descricao"])

    def test_ambiente_pode_ser_criado_e_editado_por_post(self):
        model = Ambiente
        dados = {
            "codigo": "HTTP-AMB-ADD-001",
            "nome": "Auditório cadastrado pelo Admin",
            "descricao": "Cadastro inicial.",
            "localizacao": "Bloco C",
            "capacidade": "32",
            "ativo": "on",
            "categoria": str(self.categoria_ambiente.pk),
            "responsavel": str(self.responsavel.pk),
        }
        resposta = self.client.post(self.admin_url(model, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        ambiente = model.objects.get(codigo=dados["codigo"])

        dados["nome"] = "Auditório atualizado pelo Admin"
        dados["capacidade"] = "36"
        resposta = self.client.post(
            self.admin_url(model, "change", ambiente.pk), dados
        )
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        ambiente.refresh_from_db()
        self.assertEqual(ambiente.nome, dados["nome"])
        self.assertEqual(ambiente.capacidade, 36)

    def test_categoria_equipamento_pode_ser_criada_e_editada_por_post(self):
        model = CategoriaEquipamento
        dados = {"nome": "Categoria equipamento nova", "descricao": "Inicial"}
        resposta = self.client.post(self.admin_url(model, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        categoria = model.objects.get(nome=dados["nome"])

        dados["descricao"] = "Descrição alterada"
        resposta = self.client.post(
            self.admin_url(model, "change", categoria.pk), dados
        )
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        categoria.refresh_from_db()
        self.assertEqual(categoria.descricao, dados["descricao"])

    def test_equipamento_pode_ser_criado_e_editado_por_post(self):
        model = Equipamento
        dados = {
            "codigo": "HTTP-EQP-ADD-001",
            "nome": "Caixa de som Admin",
            "descricao": "Cadastro inicial.",
            "quantidade_total": "6",
            "ativo": "on",
            "categoria": str(self.categoria_equipamento.pk),
        }
        resposta = self.client.post(self.admin_url(model, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        equipamento = model.objects.get(codigo=dados["codigo"])

        dados["nome"] = "Caixa de som atualizada"
        dados["quantidade_total"] = "7"
        resposta = self.client.post(
            self.admin_url(model, "change", equipamento.pk), dados
        )
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        equipamento.refresh_from_db()
        self.assertEqual(equipamento.nome, dados["nome"])
        self.assertEqual(equipamento.quantidade_total, 7)

    def test_reserva_pode_ser_criada_e_editada_por_post(self):
        model = Reserva
        inicio = INICIO_BASE + timedelta(days=4)
        fim = inicio + timedelta(hours=1)
        dados = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": Reserva.Status.PENDENTE,
            "observacoes": "Criada pelo Admin.",
            "avaliado_por": "",
            "avaliado_em_0": "",
            "avaliado_em_1": "",
            "justificativa": "",
        }
        dados.update(self.datetime_post_data("inicio", inicio))
        dados.update(self.datetime_post_data("fim", fim))
        resposta_formulario = self.client.get(self.admin_url(model, "add"))
        self.assertEqual(resposta_formulario.status_code, 200)
        dados.update(self.inline_management_data(resposta_formulario))
        resposta = self.client.post(self.admin_url(model, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        reserva = model.objects.get(observacoes="Criada pelo Admin.")

        dados["status"] = Reserva.Status.APROVADA
        dados["avaliado_por"] = str(self.admin_user.pk)
        dados.update(self.datetime_post_data("avaliado_em", fim))
        dados["justificativa"] = "Avaliada em teste do Admin."
        resposta_formulario = self.client.get(
            self.admin_url(model, "change", reserva.pk)
        )
        self.assertEqual(resposta_formulario.status_code, 200)
        dados.update(self.inline_management_data(resposta_formulario))
        resposta = self.client.post(
            self.admin_url(model, "change", reserva.pk), dados
        )
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        reserva.refresh_from_db()
        self.assertEqual(reserva.status, Reserva.Status.APROVADA)
        self.assertEqual(reserva.avaliado_por, self.admin_user)
        self.assertEqual(reserva.justificativa, dados["justificativa"])
        self.assertIsNotNone(reserva.avaliado_em)
        self.assertTrue(timezone.is_aware(reserva.avaliado_em))

    def test_timestamps_da_reserva_sao_readonly_e_post_nao_muda_os_valores(self):
        reserva = Reserva.objects.get(pk=self.reserva.pk)
        criado_em_antes = reserva.criado_em
        atualizado_em_antes = reserva.atualizado_em
        change_url = self.admin_url(Reserva, "change", reserva.pk)
        response = self.client.get(change_url)

        self.assertEqual(response.status_code, 200)
        admin_form = response.context["adminform"]
        self.assertIn("criado_em", admin_form.readonly_fields)
        self.assertIn("atualizado_em", admin_form.readonly_fields)
        self.assertNotIn("criado_em", admin_form.form.fields)
        self.assertNotIn("atualizado_em", admin_form.form.fields)

        dados = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": reserva.status,
            "observacoes": "Sem alteração nos timestamps.",
            "avaliado_por": "",
            "avaliado_em_0": "",
            "avaliado_em_1": "",
            "justificativa": "",
            "criado_em_0": "01/01/2099",
            "criado_em_1": "23:59:59",
            "atualizado_em_0": "01/01/2099",
            "atualizado_em_1": "23:59:59",
        }
        dados.update(self.datetime_post_data("inicio", reserva.inicio))
        dados.update(self.datetime_post_data("fim", reserva.fim))
        dados.update(self.inline_management_data(response))
        with patch(
            "django.db.models.fields.timezone.now",
            return_value=atualizado_em_antes,
        ):
            response = self.client.post(change_url, dados)

        self.assertEqual(response.status_code, 302, response.content.decode())
        reserva.refresh_from_db()
        self.assertEqual(reserva.criado_em, criado_em_antes)
        self.assertEqual(reserva.atualizado_em, atualizado_em_antes)

    def test_reserva_equipamento_pode_ser_criada_e_editada_por_post(self):
        model = ReservaEquipamento
        reserva = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=INICIO_BASE + timedelta(days=1),
            fim=FIM_BASE + timedelta(days=1),
        )
        dados = {
            "reserva": str(reserva.pk),
            "equipamento": str(self.equipamento.pk),
            "quantidade": "3",
        }
        resposta = self.client.post(self.admin_url(model, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        item = model.objects.get(reserva=reserva, equipamento=self.equipamento)

        dados["quantidade"] = "4"
        resposta = self.client.post(
            self.admin_url(model, "change", item.pk), dados
        )
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        item.refresh_from_db()
        self.assertEqual(item.quantidade, 4)

    def test_bloqueio_pode_ser_criado_e_editado_por_post(self):
        model = BloqueioAmbiente
        inicio = INICIO_BASE + timedelta(days=6)
        fim = inicio + timedelta(hours=2)
        dados = {
            "ambiente": str(self.ambiente.pk),
            "motivo": "Interdição criada pelo Admin.",
            "criado_por": str(self.criador_bloqueio.pk),
        }
        dados.update(self.datetime_post_data("inicio", inicio))
        dados.update(self.datetime_post_data("fim", fim))
        resposta = self.client.post(self.admin_url(model, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        bloqueio = model.objects.get(motivo="Interdição criada pelo Admin.")

        dados["motivo"] = "Interdição atualizada pelo Admin."
        dados.update(self.datetime_post_data("inicio", inicio + timedelta(hours=1)))
        dados.update(self.datetime_post_data("fim", fim + timedelta(hours=1)))
        resposta = self.client.post(
            self.admin_url(model, "change", bloqueio.pk), dados
        )
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        bloqueio.refresh_from_db()
        self.assertEqual(bloqueio.motivo, dados["motivo"])
        self.assertEqual(
            timezone.localtime(bloqueio.inicio).hour,
            timezone.localtime(inicio + timedelta(hours=1)).hour,
        )

    def test_categoria_sem_dependentes_pode_ser_excluida_no_admin(self):
        for model, nome in (
            (CategoriaAmbiente, "Categoria ambiente removível"),
            (CategoriaEquipamento, "Categoria equipamento removível"),
        ):
            with self.subTest(model=model.__name__):
                categoria = model.objects.create(nome=nome)
                delete_url = self.admin_url(model, "delete", categoria.pk)
                self.assertEqual(self.client.get(delete_url).status_code, 200)
                resposta = self.client.post(delete_url, {"post": "yes"})
                self.assertEqual(resposta.status_code, 302)
                self.assertFalse(model.objects.filter(pk=categoria.pk).exists())

    def test_categoria_referenciada_nao_pode_ser_excluida_no_admin(self):
        referencias = (
            (self.categoria_ambiente, Ambiente, self.ambiente.pk),
            (self.categoria_equipamento, Equipamento, self.equipamento.pk),
        )
        for categoria, modelo_relacionado, relacionado_pk in referencias:
            with self.subTest(categoria=categoria.pk):
                modelo = categoria.__class__
                delete_url = self.admin_url(modelo, "delete", categoria.pk)
                resposta = self.client.post(delete_url, {"post": "yes"})
                self.assertEqual(resposta.status_code, 200)
                self.assertTrue(modelo.objects.filter(pk=categoria.pk).exists())
                self.assertTrue(
                    modelo_relacionado.objects.filter(pk=relacionado_pk).exists()
                )

    def test_admin_permite_excluir_registros_sem_dependentes(self):
        ambiente = Ambiente.objects.create(
            codigo="HTTP-AMB-DELETE",
            nome="Ambiente removível",
            localizacao="Bloco D",
            capacidade=10,
            categoria=self.categoria_ambiente,
            responsavel=self.responsavel,
        )
        equipamento = Equipamento.objects.create(
            codigo="HTTP-EQP-DELETE",
            nome="Equipamento removível",
            quantidade_total=1,
            categoria=self.categoria_equipamento,
        )
        equipamento_associado = Equipamento.objects.create(
            codigo="HTTP-EQP-ITEM-DELETE",
            nome="Equipamento do item removível",
            quantidade_total=2,
            categoria=self.categoria_equipamento,
        )
        inicio_reserva = INICIO_BASE + timedelta(days=20)
        reserva = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=inicio_reserva,
            fim=inicio_reserva + timedelta(hours=1),
        )
        item_reserva = ReservaEquipamento.objects.create(
            reserva=self.reserva,
            equipamento=equipamento_associado,
            quantidade=1,
        )
        inicio_bloqueio = INICIO_BASE + timedelta(days=22)
        bloqueio = BloqueioAmbiente.objects.create(
            ambiente=self.ambiente,
            inicio=inicio_bloqueio,
            fim=inicio_bloqueio + timedelta(hours=1),
            motivo="Bloqueio removível",
            criado_por=self.criador_bloqueio,
        )
        registros = (
            (Ambiente, ambiente),
            (Equipamento, equipamento),
            (Reserva, reserva),
            (ReservaEquipamento, item_reserva),
            (BloqueioAmbiente, bloqueio),
        )

        for model, registro in registros:
            with self.subTest(model=model.__name__):
                delete_url = self.admin_url(model, "delete", registro.pk)
                self.assertEqual(self.client.get(delete_url).status_code, 200)
                resposta = self.client.post(delete_url, {"post": "yes"})
                self.assertEqual(resposta.status_code, 302)
                self.assertFalse(model.objects.filter(pk=registro.pk).exists())

    def test_admin_bloqueia_exclusao_de_reserva_com_equipamento_associado(self):
        delete_url = self.admin_url(Reserva, "delete", self.reserva.pk)
        resposta = self.client.post(delete_url, {"post": "yes"})

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(Reserva.objects.filter(pk=self.reserva.pk).exists())
        self.assertTrue(
            ReservaEquipamento.objects.filter(pk=self.item_reserva.pk).exists()
        )

    def test_admin_bloqueia_exclusao_direta_e_em_lote_de_reserva_concluida(self):
        permissoes = Permission.objects.filter(
            content_type__app_label="reservas",
            codename__in=("delete_reserva", "view_reserva"),
        )
        grupo = Group.objects.create(name="administrador-preservacao-historico")
        grupo.permissions.add(*permissoes)
        administrador = User.objects.create_user(
            username="staff-administrador-historico",
            password="test-only-password",
            is_staff=True,
        )
        administrador.groups.add(grupo)
        self.client.force_login(administrador)

        reserva_concluida = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=INICIO_BASE + timedelta(days=30),
            fim=INICIO_BASE + timedelta(days=30, hours=1),
            status=Reserva.Status.CONCLUIDA,
        )
        delete_url = self.admin_url(
            Reserva,
            "delete",
            reserva_concluida.pk,
        )
        resposta_direta = self.client.post(
            delete_url,
            {"post": "yes"},
            follow=True,
        )

        self.assertEqual(resposta_direta.status_code, 200)
        self.assertTrue(Reserva.objects.filter(pk=reserva_concluida.pk).exists())
        self.assertTrue(
            any(
                "registros históricos" in str(mensagem)
                for mensagem in resposta_direta.context["messages"]
            )
        )

        reserva_pendente = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=INICIO_BASE + timedelta(days=31),
            fim=INICIO_BASE + timedelta(days=31, hours=1),
        )
        changelist_url = self.admin_url(Reserva, "changelist")
        resposta_lote_misto = self.client.post(
            changelist_url,
            {
                "action": "delete_selected_reservas",
                "_selected_action": [
                    str(reserva_concluida.pk),
                    str(reserva_pendente.pk),
                ],
                "index": "0",
                "post": "yes",
            },
            follow=True,
        )

        self.assertEqual(resposta_lote_misto.status_code, 200)
        self.assertTrue(Reserva.objects.filter(pk=reserva_concluida.pk).exists())
        self.assertTrue(Reserva.objects.filter(pk=reserva_pendente.pk).exists())
        self.assertTrue(
            any(
                "Nenhuma reserva selecionada foi excluída" in str(mensagem)
                for mensagem in resposta_lote_misto.context["messages"]
            )
        )

        resposta_lote_pendente = self.client.post(
            changelist_url,
            {
                "action": "delete_selected_reservas",
                "_selected_action": [str(reserva_pendente.pk)],
                "index": "0",
                "post": "yes",
            },
            follow=True,
        )

        self.assertEqual(resposta_lote_pendente.status_code, 200)
        self.assertFalse(Reserva.objects.filter(pk=reserva_pendente.pk).exists())
        self.assertTrue(Reserva.objects.filter(pk=reserva_concluida.pk).exists())

    def test_admin_de_reserva_nao_oferece_exclusao_em_lote_padrao(self):
        reserva_concluida = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=INICIO_BASE + timedelta(days=40),
            fim=INICIO_BASE + timedelta(days=40, hours=1),
            status=Reserva.Status.CONCLUIDA,
        )
        changelist_url = self.admin_url(Reserva, "changelist")

        resposta = self.client.get(changelist_url)
        acoes = [
            nome
            for nome, _ in resposta.context["action_form"]
            .fields["action"]
            .choices
        ]
        self.assertNotIn("delete_selected", acoes)
        self.assertIn("delete_selected_reservas", acoes)

        # Antes da correção, este POST gerava HTTP 500 (ProtectedError).
        resposta = self.client.post(
            changelist_url,
            {
                "action": "delete_selected",
                "_selected_action": [str(reserva_concluida.pk)],
                "index": "0",
                "post": "yes",
            },
        )
        self.assertNotEqual(resposta.status_code, 500)
        self.assertTrue(Reserva.objects.filter(pk=reserva_concluida.pk).exists())

    def test_admin_rejeita_ambiente_com_capacidade_zero_sem_salvar(self):
        dados = {
            "codigo": "HTTP-AMB-CAP-0",
            "nome": "Ambiente inválido",
            "descricao": "",
            "localizacao": "Bloco inválido",
            "capacidade": "0",
            "ativo": "on",
            "categoria": str(self.categoria_ambiente.pk),
            "responsavel": str(self.responsavel.pk),
        }
        self.assert_admin_post_invalid(Ambiente, dados, "capacidade")
        self.assertFalse(Ambiente.objects.filter(codigo=dados["codigo"]).exists())

    def test_admin_rejeita_quantidade_negativa_e_codigo_duplicado_de_equipamento(self):
        dados = {
            "codigo": "HTTP-EQP-NEGATIVO",
            "nome": "Equipamento inválido",
            "descricao": "",
            "quantidade_total": "-1",
            "ativo": "on",
            "categoria": str(self.categoria_equipamento.pk),
        }
        self.assert_admin_post_invalid(Equipamento, dados, "quantidade_total")
        self.assertFalse(Equipamento.objects.filter(codigo=dados["codigo"]).exists())

        duplicado = {
            **dados,
            "codigo": self.equipamento.codigo,
            "quantidade_total": "2",
        }
        count_before = Equipamento.objects.count()
        resposta = self.client.post(self.admin_url(Equipamento, "add"), duplicado)
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("codigo", resposta.context["adminform"].form.errors)
        self.assertEqual(Equipamento.objects.count(), count_before)

    def test_admin_rejeita_reserva_com_intervalo_invalido_e_status_desconhecido(self):
        base = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": Reserva.Status.PENDENTE,
            "observacoes": "",
            "avaliado_por": "",
            "avaliado_em_0": "",
            "avaliado_em_1": "",
            "justificativa": "",
        }
        intervalo_invalido = dict(base)
        intervalo_invalido.update(self.datetime_post_data("inicio", INICIO_BASE))
        intervalo_invalido.update(self.datetime_post_data("fim", INICIO_BASE))
        self.assert_admin_post_invalid(Reserva, intervalo_invalido, "fim")

        inicio = INICIO_BASE + timedelta(days=10)
        dados_status = dict(base)
        dados_status["status"] = "DESCONHECIDO"
        dados_status.update(self.datetime_post_data("inicio", inicio))
        dados_status.update(self.datetime_post_data("fim", inicio + timedelta(hours=1)))
        self.assert_admin_post_invalid(Reserva, dados_status, "status")
        self.assertFalse(
            Reserva.objects.filter(status="DESCONHECIDO").exists()
        )

    def test_admin_rejeita_aprovar_reserva_sobreposta_a_outra_aprovada(self):
        inicio = INICIO_BASE + timedelta(days=20)
        fim = inicio + timedelta(hours=2)
        Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=inicio,
            fim=fim,
            status=Reserva.Status.APROVADA,
        )
        dados = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": Reserva.Status.APROVADA,
            "observacoes": "Tentativa de aprovação conflitante.",
            "avaliado_por": str(self.admin_user.pk),
            "justificativa": "",
        }
        dados.update(self.datetime_post_data("avaliado_em", INICIO_BASE))
        dados.update(
            self.datetime_post_data("inicio", inicio + timedelta(hours=1))
        )
        dados.update(self.datetime_post_data("fim", fim + timedelta(hours=1)))
        dados.update(
            self.inline_management_data(
                self.client.get(self.admin_url(Reserva, "add"))
            )
        )

        resposta = self.assert_admin_post_invalid(Reserva, dados, "status")
        self.assertContains(resposta, "já possui reserva aprovada")

        # Horário consecutivo (começa quando a outra termina) é aceito.
        dados.update(self.datetime_post_data("inicio", fim))
        dados.update(self.datetime_post_data("fim", fim + timedelta(hours=1)))
        resposta = self.client.post(self.admin_url(Reserva, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())

    def test_admin_rejeita_aprovar_reserva_durante_bloqueio(self):
        # self.bloqueio ocupa o ambiente de INICIO_BASE+2d a FIM_BASE+2d.
        dados = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": Reserva.Status.APROVADA,
            "observacoes": "Tentativa durante bloqueio.",
            "avaliado_por": str(self.admin_user.pk),
            "justificativa": "",
        }
        dados.update(self.datetime_post_data("avaliado_em", INICIO_BASE))
        dados.update(self.datetime_post_data("inicio", self.bloqueio.inicio))
        dados.update(self.datetime_post_data("fim", self.bloqueio.fim))
        dados.update(
            self.inline_management_data(
                self.client.get(self.admin_url(Reserva, "add"))
            )
        )

        resposta = self.assert_admin_post_invalid(Reserva, dados, "status")
        self.assertContains(resposta, "o ambiente está bloqueado")

        # Como PENDENTE (ainda sem avaliação) a mesma solicitação é registrada.
        dados["status"] = Reserva.Status.PENDENTE
        dados.update(
            {"avaliado_por": "", "avaliado_em_0": "", "avaliado_em_1": ""}
        )
        resposta = self.client.post(self.admin_url(Reserva, "add"), dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())

    def test_admin_rejeita_aprovar_reserva_sem_estoque_no_horario(self):
        outro_ambiente = Ambiente.objects.create(
            codigo="HTTP-AMB-EST",
            nome="Sala estoque HTTP",
            localizacao="Bloco HTTP",
            capacidade=10,
            categoria=self.categoria_ambiente,
            responsavel=self.responsavel,
        )
        # Outra reserva aprovada no mesmo horário usa 3 dos 4 projetores.
        concorrente = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=outro_ambiente,
            inicio=INICIO_BASE,
            fim=FIM_BASE,
            status=Reserva.Status.APROVADA,
        )
        ReservaEquipamento.objects.create(
            reserva=concorrente, equipamento=self.equipamento, quantidade=3
        )
        change_url = self.admin_url(Reserva, "change", self.reserva.pk)
        dados = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": Reserva.Status.APROVADA,
            "observacoes": self.reserva.observacoes,
            "avaliado_por": str(self.admin_user.pk),
            "justificativa": "",
        }
        dados.update(self.datetime_post_data("avaliado_em", INICIO_BASE))
        dados.update(self.datetime_post_data("inicio", INICIO_BASE))
        dados.update(self.datetime_post_data("fim", FIM_BASE))
        dados.update(self.inline_management_data(self.client.get(change_url)))

        # self.reserva pede 2 projetores; só resta 1 no horário.
        resposta = self.client.post(change_url, dados)

        self.assertEqual(resposta.status_code, 200)
        self.assertContains(resposta, "Estoque insuficiente no horário")
        self.reserva.refresh_from_db()
        self.assertEqual(self.reserva.status, Reserva.Status.PENDENTE)

        # Reduzindo o pedido para 1 unidade, a aprovação é aceita.
        prefixo = (
            resposta.context["inline_admin_formsets"][0].formset.prefix
        )
        dados[f"{prefixo}-0-quantidade"] = "1"
        resposta = self.client.post(change_url, dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        self.reserva.refresh_from_db()
        self.assertEqual(self.reserva.status, Reserva.Status.APROVADA)

    def test_admin_inline_rejeita_equipamento_inativo(self):
        inativo = Equipamento.objects.create(
            codigo="HTTP-EQP-INATIVO",
            nome="Projetor inativo HTTP",
            quantidade_total=2,
            ativo=False,
            categoria=self.categoria_equipamento,
        )
        change_url = self.admin_url(Reserva, "change", self.reserva.pk)
        resposta_formulario = self.client.get(change_url)
        dados = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": Reserva.Status.PENDENTE,
            "observacoes": self.reserva.observacoes,
            "avaliado_por": "",
            "avaliado_em_0": "",
            "avaliado_em_1": "",
            "justificativa": "",
        }
        dados.update(self.datetime_post_data("inicio", INICIO_BASE))
        dados.update(self.datetime_post_data("fim", FIM_BASE))
        dados.update(self.inline_management_data(resposta_formulario))
        prefixo = resposta_formulario.context["inline_admin_formsets"][
            0
        ].formset.prefix
        dados[f"{prefixo}-TOTAL_FORMS"] = "2"
        dados[f"{prefixo}-1-equipamento"] = str(inativo.pk)
        dados[f"{prefixo}-1-quantidade"] = "1"

        resposta = self.client.post(change_url, dados)

        self.assertEqual(resposta.status_code, 200)
        self.assertContains(resposta, "está inativo e não pode ser reservado")
        self.assertFalse(
            ReservaEquipamento.objects.filter(equipamento=inativo).exists()
        )

    def test_admin_rejeita_reserva_em_ambiente_ou_por_usuario_inativo(self):
        ambiente_inativo = Ambiente.objects.create(
            codigo="HTTP-AMB-INATIVO",
            nome="Sala desativada HTTP",
            localizacao="Bloco HTTP",
            capacidade=10,
            ativo=False,
            categoria=self.categoria_ambiente,
            responsavel=self.responsavel,
        )
        usuario_inativo = User.objects.create_user(
            username="solicitante-inativo-http", is_active=False
        )
        inicio = INICIO_BASE + timedelta(days=25)
        base = {
            "status": Reserva.Status.PENDENTE,
            "observacoes": "",
            "avaliado_por": "",
            "avaliado_em_0": "",
            "avaliado_em_1": "",
            "justificativa": "",
        }
        base.update(self.datetime_post_data("inicio", inicio))
        base.update(self.datetime_post_data("fim", inicio + timedelta(hours=1)))
        base.update(
            self.inline_management_data(
                self.client.get(self.admin_url(Reserva, "add"))
            )
        )

        dados_ambiente = dict(
            base,
            solicitante=str(self.solicitante.pk),
            ambiente=str(ambiente_inativo.pk),
        )
        resposta = self.assert_admin_post_invalid(Reserva, dados_ambiente, "ambiente")
        self.assertContains(resposta, "Este ambiente está inativo")

        dados_usuario = dict(
            base,
            solicitante=str(usuario_inativo.pk),
            ambiente=str(self.ambiente.pk),
        )
        resposta = self.assert_admin_post_invalid(
            Reserva, dados_usuario, "solicitante"
        )
        self.assertContains(resposta, "Este usuário está inativo")

    def test_admin_exige_avaliador_data_e_justificativa_ao_rejeitar(self):
        change_url = self.admin_url(Reserva, "change", self.reserva.pk)
        dados = {
            "solicitante": str(self.solicitante.pk),
            "ambiente": str(self.ambiente.pk),
            "status": Reserva.Status.REJEITADA,
            "observacoes": self.reserva.observacoes,
            "avaliado_por": "",
            "avaliado_em_0": "",
            "avaliado_em_1": "",
            "justificativa": "",
        }
        dados.update(self.datetime_post_data("inicio", INICIO_BASE))
        dados.update(self.datetime_post_data("fim", FIM_BASE))
        dados.update(self.inline_management_data(self.client.get(change_url)))

        resposta = self.client.post(change_url, dados)

        self.assertEqual(resposta.status_code, 200)
        form = resposta.context["adminform"].form
        for campo in ("avaliado_por", "avaliado_em", "justificativa"):
            self.assertIn(campo, form.errors)
        self.reserva.refresh_from_db()
        self.assertEqual(self.reserva.status, Reserva.Status.PENDENTE)

        dados["avaliado_por"] = str(self.admin_user.pk)
        dados.update(self.datetime_post_data("avaliado_em", FIM_BASE))
        dados["justificativa"] = "Ambiente reservado para outra atividade."
        resposta = self.client.post(change_url, dados)

        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        self.reserva.refresh_from_db()
        self.assertEqual(self.reserva.status, Reserva.Status.REJEITADA)
        self.assertEqual(self.reserva.avaliado_por, self.admin_user)

    def test_admin_preserva_reserva_concluida(self):
        def dados_da(reserva, **alteracoes):
            dados = {
                "solicitante": str(reserva.solicitante_id),
                "ambiente": str(reserva.ambiente_id),
                "status": reserva.status,
                "observacoes": reserva.observacoes,
                "avaliado_por": "",
                "avaliado_em_0": "",
                "avaliado_em_1": "",
                "justificativa": "",
            }
            dados.update(
                self.datetime_post_data("inicio", timezone.localtime(reserva.inicio))
            )
            dados.update(
                self.datetime_post_data("fim", timezone.localtime(reserva.fim))
            )
            url = self.admin_url(Reserva, "change", reserva.pk)
            dados.update(self.inline_management_data(self.client.get(url)))
            dados.update(alteracoes)
            return url, dados

        # Concluir uma reserva futura é recusado.
        url, dados = dados_da(self.reserva, status=Reserva.Status.CONCLUIDA)
        resposta = self.client.post(url, dados)
        self.assertEqual(resposta.status_code, 200)
        self.assertContains(resposta, "cujo período já terminou")
        self.reserva.refresh_from_db()
        self.assertEqual(self.reserva.status, Reserva.Status.PENDENTE)

        # Reserva já concluída não volta a outro status...
        agora = timezone.now().replace(second=0, microsecond=0)
        concluida = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=agora - timedelta(days=2, hours=2),
            fim=agora - timedelta(days=2),
            status=Reserva.Status.CONCLUIDA,
        )
        url, dados = dados_da(concluida, status=Reserva.Status.PENDENTE)
        resposta = self.client.post(url, dados)
        self.assertEqual(resposta.status_code, 200)
        self.assertContains(resposta, "registro histórico")
        concluida.refresh_from_db()
        self.assertEqual(concluida.status, Reserva.Status.CONCLUIDA)

        # ...mas as observações podem ser atualizadas.
        url, dados = dados_da(concluida, observacoes="Uso registrado.")
        resposta = self.client.post(url, dados)
        self.assertEqual(resposta.status_code, 302, resposta.content.decode())
        concluida.refresh_from_db()
        self.assertEqual(concluida.observacoes, "Uso registrado.")

    def test_admin_alerta_reservas_aprovadas_ao_criar_bloqueio(self):
        dia = INICIO_BASE.replace(hour=8) + timedelta(days=16)
        fulano = User.objects.create_user(
            username="fulano-http", first_name="Fulano", last_name="Silva"
        )

        def reserva(inicio_h, fim_h, status, solicitante):
            return Reserva.objects.create(
                solicitante=solicitante,
                ambiente=self.ambiente,
                inicio=dia.replace(hour=inicio_h),
                fim=dia.replace(hour=fim_h),
                status=status,
                avaliado_por=self.admin_user,
                avaliado_em=dia,
            )

        aprovada_1 = reserva(9, 10, Reserva.Status.APROVADA, fulano)
        aprovada_2 = reserva(11, 13, Reserva.Status.APROVADA, self.solicitante)
        consecutiva = reserva(13, 14, Reserva.Status.APROVADA, self.solicitante)
        pendente = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=dia.replace(hour=10),
            fim=dia.replace(hour=11),
        )
        dados = {
            "ambiente": str(self.ambiente.pk),
            "motivo": "Manutenção elétrica",
            "criado_por": str(self.criador_bloqueio.pk),
        }
        # Bloqueio das 8h às 12h.
        dados.update(self.datetime_post_data("inicio", dia))
        dados.update(self.datetime_post_data("fim", dia.replace(hour=12)))

        resposta = self.client.post(
            self.admin_url(BloqueioAmbiente, "add"), dados, follow=True
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(
            BloqueioAmbiente.objects.filter(motivo="Manutenção elétrica").exists()
        )
        avisos = [
            str(m) for m in resposta.context["messages"] if m.level_tag == "warning"
        ]
        self.assertEqual(len(avisos), 1)
        data = f"{dia:%d/%m/%Y}"
        self.assertEqual(
            avisos[0],
            "Atenção: este bloqueio coincide com 2 reserva(s) aprovada(s): "
            f"Fulano Silva — {data} 09:00 a {data} 10:00; "
            f"{self.solicitante.username} — {data} 11:00 a {data} 13:00. "
            "Revise-as manualmente.",
        )
        # Nenhuma reserva tem o status alterado.
        for item, status in (
            (aprovada_1, Reserva.Status.APROVADA),
            (aprovada_2, Reserva.Status.APROVADA),
            (consecutiva, Reserva.Status.APROVADA),
            (pendente, Reserva.Status.PENDENTE),
        ):
            item.refresh_from_db()
            self.assertEqual(item.status, status)

    def test_admin_nao_alerta_bloqueio_sem_reservas_aprovadas(self):
        dados = {
            "ambiente": str(self.ambiente.pk),
            "motivo": "Pintura sem conflitos",
            "criado_por": str(self.criador_bloqueio.pk),
        }
        inicio = INICIO_BASE + timedelta(days=60)
        dados.update(self.datetime_post_data("inicio", inicio))
        dados.update(self.datetime_post_data("fim", inicio + timedelta(hours=2)))

        resposta = self.client.post(
            self.admin_url(BloqueioAmbiente, "add"), dados, follow=True
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(
            BloqueioAmbiente.objects.filter(motivo="Pintura sem conflitos").exists()
        )
        self.assertFalse(
            any(m.level_tag == "warning" for m in resposta.context["messages"])
        )

    def test_admin_rejeita_quantidade_zero_e_associacao_duplicada(self):
        nova_reserva = Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=INICIO_BASE + timedelta(days=12),
            fim=FIM_BASE + timedelta(days=12),
        )
        dados_zero = {
            "reserva": str(nova_reserva.pk),
            "equipamento": str(self.equipamento.pk),
            "quantidade": "0",
        }
        self.assert_admin_post_invalid(
            ReservaEquipamento, dados_zero, "quantidade"
        )

        duplicada = {
            "reserva": str(self.reserva.pk),
            "equipamento": str(self.equipamento.pk),
            "quantidade": "3",
        }
        count_before = ReservaEquipamento.objects.count()
        resposta = self.client.post(
            self.admin_url(ReservaEquipamento, "add"), duplicada
        )
        self.assertEqual(resposta.status_code, 200)
        form = resposta.context["adminform"].form
        self.assertTrue(form.errors)
        self.assertEqual(ReservaEquipamento.objects.count(), count_before)

    def test_admin_rejeita_bloqueio_com_intervalo_invalido_sem_salvar(self):
        dados = {
            "ambiente": str(self.ambiente.pk),
            "motivo": "Intervalo inválido.",
            "criado_por": str(self.criador_bloqueio.pk),
        }
        dados.update(self.datetime_post_data("inicio", INICIO_BASE))
        dados.update(self.datetime_post_data("fim", INICIO_BASE))
        self.assert_admin_post_invalid(BloqueioAmbiente, dados, "fim")
        self.assertFalse(
            BloqueioAmbiente.objects.filter(motivo="Intervalo inválido.").exists()
        )
