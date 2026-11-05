"""Testes HTTP dos filtros, pesquisas e inlines da etapa C1.10."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase
from django.urls import reverse
from django.utils import formats

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)
from reservas.models import BloqueioAmbiente, Reserva, ReservaEquipamento


User = get_user_model()
SAO_PAULO = ZoneInfo("America/Sao_Paulo")
INICIO_BASE = datetime(2026, 11, 10, 10, 0, tzinfo=SAO_PAULO)


class AdminFiltersSearchAndInlineTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_superuser(
            username="admin-c110",
            email="admin-c110@example.invalid",
            password="test-only-password",
        )
        cls.solicitante_a = User.objects.create_user(
            username="ana-c110",
            first_name="Ana",
            last_name="Silva",
            email="ana-c110@example.invalid",
        )
        cls.solicitante_b = User.objects.create_user(
            username="bruno-c110",
            first_name="Bruno",
            last_name="Souza",
            email="bruno-c110@example.invalid",
        )
        cls.responsavel_a = User.objects.create_user(username="responsavel-a-c110")
        cls.responsavel_b = User.objects.create_user(username="responsavel-b-c110")

        cls.categoria_lab = CategoriaAmbiente.objects.create(
            nome="Laboratórios C1.10"
        )
        cls.categoria_sala = CategoriaAmbiente.objects.create(nome="Salas C1.10")
        cls.ambiente_lab = cls.create_ambiente(
            codigo="C110-AMB-LAB-01",
            nome="Laboratório de Química C1.10",
            localizacao="Bloco C1.10",
            categoria=cls.categoria_lab,
            responsavel=cls.responsavel_a,
        )
        cls.ambiente_sala = cls.create_ambiente(
            codigo="C110-AMB-SAL-01",
            nome="Sala de Estudos C1.10",
            localizacao="Bloco S1",
            categoria=cls.categoria_sala,
            responsavel=cls.responsavel_b,
        )
        cls.ambiente_lab_inativo = cls.create_ambiente(
            codigo="C110-AMB-LAB-02",
            nome="Laboratório Inativo C1.10",
            localizacao="Bloco C1.10",
            categoria=cls.categoria_lab,
            responsavel=cls.responsavel_a,
            ativo=False,
        )

        cls.categoria_audio = CategoriaEquipamento.objects.create(
            nome="Audiovisual C1.10"
        )
        cls.categoria_informatica = CategoriaEquipamento.objects.create(
            nome="Informática C1.10"
        )
        cls.projetor = cls.create_equipamento(
            codigo="C110-EQP-PROJ-01",
            nome="Projetor Multimídia C1.10",
            categoria=cls.categoria_audio,
            quantidade_total=5,
        )
        cls.microfone = cls.create_equipamento(
            codigo="C110-EQP-MIC-01",
            nome="Microfone C1.10",
            categoria=cls.categoria_audio,
            quantidade_total=2,
            ativo=False,
        )
        cls.impressora = cls.create_equipamento(
            codigo="C110-EQP-IMP-01",
            nome="Impressora C1.10",
            categoria=cls.categoria_informatica,
            quantidade_total=1,
        )

        cls.reserva_pendente = cls.create_reserva(
            solicitante=cls.solicitante_a,
            ambiente=cls.ambiente_lab,
            inicio=INICIO_BASE,
            status=Reserva.Status.PENDENTE,
        )
        cls.reserva_aprovada = cls.create_reserva(
            solicitante=cls.solicitante_b,
            ambiente=cls.ambiente_sala,
            inicio=INICIO_BASE + timedelta(days=1),
            status=Reserva.Status.APROVADA,
        )
        cls.reserva_cancelada = cls.create_reserva(
            solicitante=cls.solicitante_a,
            ambiente=cls.ambiente_lab_inativo,
            inicio=INICIO_BASE + timedelta(days=2),
            status=Reserva.Status.CANCELADA,
        )
        cls.item_pendente = ReservaEquipamento.objects.create(
            reserva=cls.reserva_pendente,
            equipamento=cls.projetor,
            quantidade=2,
        )
        cls.item_aprovado = ReservaEquipamento.objects.create(
            reserva=cls.reserva_aprovada,
            equipamento=cls.microfone,
            quantidade=1,
        )
        cls.criador_bloqueio_a = User.objects.create_user(
            username="zelador-a-c110"
        )
        cls.criador_bloqueio_b = User.objects.create_user(
            username="zelador-b-c110"
        )
        cls.bloqueio_lab = cls.create_bloqueio(
            ambiente=cls.ambiente_lab,
            criado_por=cls.criador_bloqueio_a,
            inicio=INICIO_BASE + timedelta(days=3),
            motivo="Manutenção do projetor C1.10",
        )
        cls.bloqueio_sala = cls.create_bloqueio(
            ambiente=cls.ambiente_sala,
            criado_por=cls.criador_bloqueio_b,
            inicio=INICIO_BASE + timedelta(days=4),
            motivo="Limpeza da sala C1.10",
        )

    @classmethod
    def create_ambiente(
        cls, *, codigo, nome, localizacao, categoria, responsavel, ativo=True
    ):
        return Ambiente.objects.create(
            codigo=codigo,
            nome=nome,
            localizacao=localizacao,
            capacidade=20,
            categoria=categoria,
            responsavel=responsavel,
            ativo=ativo,
        )

    @classmethod
    def create_equipamento(
        cls, *, codigo, nome, categoria, quantidade_total, ativo=True
    ):
        return Equipamento.objects.create(
            codigo=codigo,
            nome=nome,
            categoria=categoria,
            quantidade_total=quantidade_total,
            ativo=ativo,
        )

    @classmethod
    def create_reserva(cls, *, solicitante, ambiente, inicio, status):
        return Reserva.objects.create(
            solicitante=solicitante,
            ambiente=ambiente,
            inicio=inicio,
            fim=inicio + timedelta(hours=1),
            status=status,
        )

    @classmethod
    def create_bloqueio(cls, *, ambiente, criado_por, inicio, motivo):
        return BloqueioAmbiente.objects.create(
            ambiente=ambiente,
            criado_por=criado_por,
            inicio=inicio,
            fim=inicio + timedelta(hours=2),
            motivo=motivo,
        )

    def setUp(self):
        self.client.force_login(self.admin_user)

    @staticmethod
    def changelist_url(model):
        return reverse(
            f"admin:{model._meta.app_label}_{model._meta.model_name}_changelist"
        )

    def result_ids(self, model, params=None):
        response = self.client.get(self.changelist_url(model), params or {})
        self.assertEqual(response.status_code, 200)
        return {obj.pk for obj in response.context["cl"].result_list}

    def assert_search_results(self, model, term, expected_ids):
        response = self.client.get(self.changelist_url(model), {"q": term})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {obj.pk for obj in response.context["cl"].result_list},
            set(expected_ids),
        )

    def test_filtro_de_ambiente_combina_categoria_situacao_e_responsavel(self):
        result = self.result_ids(
            Ambiente,
            {
                "categoria__id__exact": str(self.categoria_lab.pk),
                "ativo__exact": "1",
                "responsavel__id__exact": str(self.responsavel_a.pk),
            },
        )

        self.assertEqual(result, {self.ambiente_lab.pk})

    def test_filtro_de_equipamento_combina_categoria_e_situacao(self):
        result = self.result_ids(
            Equipamento,
            {
                "categoria__id__exact": str(self.categoria_audio.pk),
                "ativo__exact": "0",
            },
        )

        self.assertEqual(result, {self.microfone.pk})

    def test_filtro_de_reserva_combina_status_ambiente_e_solicitante(self):
        result = self.result_ids(
            Reserva,
            {
                "status__exact": Reserva.Status.APROVADA,
                "ambiente__id__exact": str(self.ambiente_sala.pk),
                "solicitante__id__exact": str(self.solicitante_b.pk),
            },
        )

        self.assertEqual(result, {self.reserva_aprovada.pk})

    def test_reservas_sao_filtradas_e_navegadas_pela_data_de_inicio(self):
        # As três reservas foram criadas no mesmo momento, em dias de uso
        # diferentes: só a data de início distingue a aprovada (dia + 1).
        dia = INICIO_BASE.replace(hour=0) + timedelta(days=1)

        # O que a pessoa vê: filtro lateral "Início" e navegação por datas
        # baseada no início da reserva (antes era a data de criação).
        response = self.client.get(self.changelist_url(Reserva))
        changelist = response.context["cl"]
        self.assertEqual(changelist.date_hierarchy, "inicio")
        self.assertIn(
            "inicio",
            [getattr(spec, "field_path", None) for spec in changelist.filter_specs],
        )

        por_filtro = self.result_ids(
            Reserva,
            {
                "inicio__gte": dia.isoformat(),
                "inicio__lt": (dia + timedelta(days=1)).isoformat(),
            },
        )
        por_hierarquia = self.result_ids(
            Reserva,
            {
                "inicio__year": str(dia.year),
                "inicio__month": str(dia.month),
                "inicio__day": str(dia.day),
            },
        )

        self.assertEqual(por_filtro, {self.reserva_aprovada.pk})
        self.assertEqual(por_hierarquia, {self.reserva_aprovada.pk})
        self.assertEqual(
            self.result_ids(Reserva),
            {
                self.reserva_pendente.pk,
                self.reserva_aprovada.pk,
                self.reserva_cancelada.pk,
            },
        )

    def test_filtro_de_bloqueio_aplica_ambiente_responsavel_e_periodo(self):
        inicio = self.bloqueio_lab.inicio.replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        fim = inicio + timedelta(days=1)
        result = self.result_ids(
            BloqueioAmbiente,
            {
                "ambiente__id__exact": str(self.ambiente_lab.pk),
                "criado_por__id__exact": str(self.criador_bloqueio_a.pk),
                "inicio__gte": inicio.isoformat(),
                "inicio__lt": fim.isoformat(),
            },
        )

        self.assertEqual(result, {self.bloqueio_lab.pk})

    def test_filtro_de_associacao_restringe_reserva_e_equipamento(self):
        result = self.result_ids(
            ReservaEquipamento,
            {
                "reserva__id__exact": str(self.reserva_pendente.pk),
                "equipamento__id__exact": str(self.projetor.pk),
            },
        )

        self.assertEqual(result, {self.item_pendente.pk})

    def test_pesquisas_de_ambiente_por_codigo_nome_localizacao_e_sem_resultado(self):
        for term in (
            "C110-AMB-LAB-01",
            "Laboratório de Química C1.10",
        ):
            with self.subTest(term=term):
                self.assert_search_results(Ambiente, term, {self.ambiente_lab.pk})
        self.assert_search_results(
            Ambiente,
            "Bloco C1.10",
            {
                self.ambiente_lab.pk,
                self.ambiente_sala.pk,
                self.ambiente_lab_inativo.pk,
            },
        )
        self.assert_search_results(Ambiente, "ambiente sem correspondência", set())

    def test_pesquisas_de_equipamento_por_codigo_nome_e_sem_resultado(self):
        self.assert_search_results(
            Equipamento, "C110-EQP-PROJ-01", {self.projetor.pk}
        )
        self.assert_search_results(
            Equipamento, "Projetor Multimídia C1.10", {self.projetor.pk}
        )
        self.assert_search_results(Equipamento, "código inexistente", set())

    def test_pesquisa_de_categorias_por_nome(self):
        self.assert_search_results(
            CategoriaAmbiente, "Laboratórios C1.10", {self.categoria_lab.pk}
        )
        self.assert_search_results(
            CategoriaEquipamento, "Audiovisual C1.10", {self.categoria_audio.pk}
        )
        self.assert_search_results(CategoriaAmbiente, "nome ausente", set())
        self.assert_search_results(CategoriaEquipamento, "nome ausente", set())

    def test_pesquisa_de_reserva_por_ambiente_e_identificacao_do_solicitante(self):
        self.assert_search_results(
            Reserva, "C110-AMB-SAL-01", {self.reserva_aprovada.pk}
        )
        self.assert_search_results(
            Reserva, "Sala de Estudos C1.10", {self.reserva_aprovada.pk}
        )
        self.assert_search_results(
            Reserva, "bruno-c110", {self.reserva_aprovada.pk}
        )
        self.assert_search_results(
            Reserva, "Bruno Souza", {self.reserva_aprovada.pk}
        )
        self.assert_search_results(Reserva, "sem-solicitante", set())

    def test_pesquisa_de_bloqueio_e_associacao_por_campos_relacionados(self):
        self.assert_search_results(
            BloqueioAmbiente, "zelador-a-c110", {self.bloqueio_lab.pk}
        )
        self.assert_search_results(
            ReservaEquipamento, "C110-EQP-PROJ-01", {self.item_pendente.pk}
        )

    def reservation_post_data(self, reserva):
        date_format = formats.get_format("DATE_INPUT_FORMATS")[0]
        time_format = formats.get_format("TIME_INPUT_FORMATS")[0]
        return {
            "solicitante": str(reserva.solicitante_id),
            "ambiente": str(reserva.ambiente_id),
            "status": reserva.status,
            "observacoes": reserva.observacoes,
            "avaliado_por": str(reserva.avaliado_por_id or ""),
            "avaliado_em_0": "",
            "avaliado_em_1": "",
            "justificativa": reserva.justificativa,
            "inicio_0": reserva.inicio.strftime(date_format),
            "inicio_1": reserva.inicio.strftime(time_format),
            "fim_0": reserva.fim.strftime(date_format),
            "fim_1": reserva.fim.strftime(time_format),
        }

    def inline_change_payload(
        self, reserva, form_response, rows, delete_indexes=()
    ):
        admin_formset = form_response.context["inline_admin_formsets"][0]
        formset = admin_formset.formset
        prefix = formset.prefix
        total_forms = max(formset.total_form_count(), len(rows))
        data = self.reservation_post_data(reserva)

        for name, value in formset.management_form.initial.items():
            data[f"{prefix}-{name}"] = str(value)
        data[f"{prefix}-TOTAL_FORMS"] = str(total_forms)
        data[f"{prefix}-INITIAL_FORMS"] = str(formset.initial_form_count())

        initial_forms = formset.initial_forms
        for index in range(total_forms):
            existing = (
                initial_forms[index].instance
                if index < len(initial_forms)
                else None
            )
            equipment_id, quantity = rows[index] if index < len(rows) else ("", "")
            data[f"{prefix}-{index}-id"] = str(existing.pk) if existing else ""
            data[f"{prefix}-{index}-reserva"] = str(reserva.pk)
            data[f"{prefix}-{index}-equipamento"] = str(equipment_id or "")
            data[f"{prefix}-{index}-quantidade"] = str(quantity or "")
            if index in delete_indexes:
                data[f"{prefix}-{index}-DELETE"] = "on"

        return data, prefix

    def get_reserva_change_response(self, reserva):
        url = reverse("admin:reservas_reserva_change", args=(reserva.pk,))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context["inline_admin_formsets"]), 1)
        return url, response

    def test_inline_adiciona_multiplos_equipamentos_em_post_http_real(self):
        reserva = self.create_reserva(
            solicitante=self.solicitante_a,
            ambiente=self.ambiente_lab,
            inicio=INICIO_BASE + timedelta(days=10),
            status=Reserva.Status.PENDENTE,
        )
        url, form_response = self.get_reserva_change_response(reserva)
        data, _ = self.inline_change_payload(
            reserva,
            form_response,
            [(self.projetor.pk, 2), (self.impressora.pk, 1)],
        )

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, 302, response.content.decode())
        self.assertEqual(
            set(
                ReservaEquipamento.objects.filter(reserva=reserva).values_list(
                    "equipamento_id", "quantidade"
                )
            ),
            {(self.projetor.pk, 2), (self.impressora.pk, 1)},
        )

    def test_inline_rejeita_quantidade_zero_e_negativa_sem_persistir(self):
        for quantity in ("0", "-1"):
            with self.subTest(quantity=quantity):
                reserva = self.create_reserva(
                    solicitante=self.solicitante_a,
                    ambiente=self.ambiente_lab,
                    inicio=INICIO_BASE + timedelta(days=20),
                    status=Reserva.Status.PENDENTE,
                )
                url, form_response = self.get_reserva_change_response(reserva)
                data, _ = self.inline_change_payload(
                    reserva, form_response, [(self.projetor.pk, quantity)]
                )

                response = self.client.post(url, data)

                self.assertEqual(response.status_code, 200)
                inline_formset = response.context["inline_admin_formsets"][0].formset
                self.assertIn("quantidade", inline_formset.forms[0].errors)
                self.assertFalse(
                    ReservaEquipamento.objects.filter(reserva=reserva).exists()
                )
                reserva.refresh_from_db()
                self.assertEqual(reserva.observacoes, "")

    def test_inline_rejeita_equipamento_duplicado_na_mesma_reserva(self):
        reserva = self.create_reserva(
            solicitante=self.solicitante_a,
            ambiente=self.ambiente_lab,
            inicio=INICIO_BASE + timedelta(days=30),
            status=Reserva.Status.PENDENTE,
        )
        url, form_response = self.get_reserva_change_response(reserva)
        data, _ = self.inline_change_payload(
            reserva,
            form_response,
            [(self.projetor.pk, 1), (self.projetor.pk, 3)],
        )

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, 200)
        inline_formset = response.context["inline_admin_formsets"][0].formset
        self.assertTrue(inline_formset.non_form_errors())
        self.assertFalse(ReservaEquipamento.objects.filter(reserva=reserva).exists())
        reserva.refresh_from_db()
        self.assertEqual(reserva.observacoes, "")

    def test_inline_atualiza_quantidade_e_remove_associacao(self):
        reserva = self.create_reserva(
            solicitante=self.solicitante_a,
            ambiente=self.ambiente_lab,
            inicio=INICIO_BASE + timedelta(days=40),
            status=Reserva.Status.PENDENTE,
        )
        item = ReservaEquipamento.objects.create(
            reserva=reserva, equipamento=self.projetor, quantidade=2
        )
        url, form_response = self.get_reserva_change_response(reserva)
        data, _ = self.inline_change_payload(
            reserva, form_response, [(self.projetor.pk, 4)]
        )

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, 302, response.content.decode())
        item.refresh_from_db()
        self.assertEqual(item.quantidade, 4)

        url, form_response = self.get_reserva_change_response(reserva)
        data, _ = self.inline_change_payload(
            reserva,
            form_response,
            [(self.projetor.pk, 4)],
            delete_indexes=(0,),
        )
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, 302, response.content.decode())
        self.assertFalse(ReservaEquipamento.objects.filter(pk=item.pk).exists())

    def test_permissoes_do_inline_bloqueiam_escrita_direta_sem_grants(self):
        reserva = self.create_reserva(
            solicitante=self.solicitante_a,
            ambiente=self.ambiente_lab,
            inicio=INICIO_BASE + timedelta(days=50),
            status=Reserva.Status.PENDENTE,
        )
        item = ReservaEquipamento.objects.create(
            reserva=reserva, equipamento=self.projetor, quantidade=2
        )
        staff = User.objects.create_user(
            username="staff-inline-readonly-c110", is_staff=True
        )
        permissions = Permission.objects.filter(
            content_type__app_label__in=("reservas",),
            codename__in=("change_reserva", "view_reservaequipamento"),
        )
        staff.user_permissions.add(*permissions)
        self.client.force_login(staff)
        url, form_response = self.get_reserva_change_response(reserva)
        admin_formset = form_response.context["inline_admin_formsets"][0]

        self.assertTrue(admin_formset.has_view_permission)
        self.assertFalse(admin_formset.has_add_permission)
        self.assertFalse(admin_formset.has_change_permission)
        self.assertFalse(admin_formset.has_delete_permission)

        data, _ = self.inline_change_payload(
            reserva,
            form_response,
            [(self.impressora.pk, 99), (self.microfone.pk, 1)],
            delete_indexes=(0,),
        )
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, 302, response.content.decode())
        item.refresh_from_db()
        self.assertEqual(item.quantidade, 2)
        self.assertFalse(
            ReservaEquipamento.objects.filter(
                reserva=reserva, equipamento=self.microfone
            ).exists()
        )

    def test_inline_usa_permissoes_nativas_de_add_change_e_delete(self):
        reserva = self.create_reserva(
            solicitante=self.solicitante_a,
            ambiente=self.ambiente_lab,
            inicio=INICIO_BASE + timedelta(days=60),
            status=Reserva.Status.PENDENTE,
        )
        staff = User.objects.create_user(
            username="staff-inline-editor-c110", is_staff=True
        )
        permissions = Permission.objects.filter(
            content_type__app_label="reservas",
            codename__in=(
                "change_reserva",
                "view_reservaequipamento",
                "add_reservaequipamento",
                "change_reservaequipamento",
                "delete_reservaequipamento",
            ),
        )
        staff.user_permissions.add(*permissions)
        self.client.force_login(staff)
        _, form_response = self.get_reserva_change_response(reserva)
        admin_formset = form_response.context["inline_admin_formsets"][0]

        self.assertTrue(admin_formset.has_view_permission)
        self.assertTrue(admin_formset.has_add_permission)
        self.assertTrue(admin_formset.has_change_permission)
        self.assertTrue(admin_formset.has_delete_permission)
