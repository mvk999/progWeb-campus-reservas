"""Testes de criação e integridade de reservas."""

from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)

from .models import BloqueioAmbiente, Reserva, ReservaEquipamento


User = get_user_model()
SAO_PAULO = ZoneInfo("America/Sao_Paulo")
INICIO_BASE = datetime(2026, 10, 29, 9, 0, tzinfo=SAO_PAULO)
FIM_BASE = datetime(2026, 10, 29, 10, 0, tzinfo=SAO_PAULO)


class ReservaModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.solicitante = User.objects.create_user(username="solicitante-reserva")
        cls.outro_solicitante = User.objects.create_user(
            username="outro-solicitante"
        )
        cls.responsavel = User.objects.create_user(username="responsavel-ambiente")
        cls.avaliador = User.objects.create_user(username="avaliador-reserva")
        cls.categoria = CategoriaAmbiente.objects.create(nome="Salas de reserva")
        cls.ambiente = cls.create_ambiente("RES-AMB-001", "Sala A")
        cls.outro_ambiente = cls.create_ambiente("RES-AMB-002", "Sala B")

    @classmethod
    def create_ambiente(cls, codigo, nome):
        return Ambiente.objects.create(
            codigo=codigo,
            nome=nome,
            localizacao="Bloco R",
            capacidade=20,
            categoria=cls.categoria,
            responsavel=cls.responsavel,
        )

    def make_reserva(self, **overrides):
        values = {
            "solicitante": self.solicitante,
            "ambiente": self.ambiente,
            "inicio": INICIO_BASE,
            "fim": FIM_BASE,
        }
        values.update(overrides)
        return Reserva(**values)

    def test_reserva_persiste_com_relacionamentos_status_default_e_string(self):
        reserva = self.make_reserva()
        reserva.save()
        salva = Reserva.objects.select_related("solicitante", "ambiente").get(
            pk=reserva.pk
        )

        self.assertEqual(salva.solicitante, self.solicitante)
        self.assertEqual(salva.ambiente, self.ambiente)
        self.assertEqual(salva.status, Reserva.Status.PENDENTE)
        self.assertTrue(timezone.is_aware(salva.inicio))
        self.assertTrue(timezone.is_aware(salva.fim))
        self.assertEqual(
            str(salva),
            f"{self.solicitante} — {self.ambiente} — "
            f"{INICIO_BASE:%d/%m/%Y %H:%M}",
        )

    def test_os_cinco_status_sao_aceitos_por_full_clean(self):
        valores_esperados = (
            "PENDENTE",
            "APROVADA",
            "REJEITADA",
            "CANCELADA",
            "CONCLUIDA",
        )
        self.assertEqual(tuple(Reserva.Status.values), valores_esperados)

        for status in Reserva.Status.values:
            with self.subTest(status=status):
                self.make_reserva(status=status).full_clean()

    def test_status_desconhecido_rejeitado_por_full_clean(self):
        reserva = self.make_reserva(status="INVALIDO")

        with self.assertRaises(ValidationError) as error:
            reserva.full_clean()

        self.assertIn("status", error.exception.message_dict)

    def test_constraint_no_banco_rejeita_status_desconhecido_sem_persistir(self):
        antes = Reserva.objects.count()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_reserva(status="INVALIDO").save()

        self.assertEqual(Reserva.objects.count(), antes)

    def test_intervalo_valido_e_aceito_por_full_clean(self):
        reserva = self.make_reserva(
            inicio=INICIO_BASE,
            fim=FIM_BASE,
        )

        reserva.full_clean()

    def test_intervalos_iguais_e_invertidos_sao_rejeitados_por_clean_e_full_clean(
        self,
    ):
        intervalos_invalidos = (
            (INICIO_BASE, INICIO_BASE),
            (INICIO_BASE, INICIO_BASE - timedelta(minutes=1)),
        )

        for inicio, fim in intervalos_invalidos:
            with self.subTest(inicio=inicio, fim=fim):
                reserva = self.make_reserva(inicio=inicio, fim=fim)
                with self.assertRaises(ValidationError) as clean_error:
                    reserva.clean()
                self.assertIn("fim", clean_error.exception.message_dict)

                with self.assertRaises(ValidationError) as full_clean_error:
                    reserva.full_clean()
                self.assertIn("fim", full_clean_error.exception.message_dict)

    def test_check_de_intervalo_rejeita_fim_igual_ou_anterior_sem_persistir(self):
        intervalos_invalidos = (
            (INICIO_BASE, INICIO_BASE),
            (INICIO_BASE, INICIO_BASE - timedelta(minutes=1)),
        )

        for inicio, fim in intervalos_invalidos:
            with self.subTest(inicio=inicio, fim=fim):
                antes = Reserva.objects.count()
                with self.assertRaises(IntegrityError):
                    with transaction.atomic():
                        self.make_reserva(inicio=inicio, fim=fim).save()
                self.assertEqual(Reserva.objects.count(), antes)

    def test_relacoes_reversas_retorna_duas_reservas_por_solicitante_e_ambiente(
        self,
    ):
        primeira = self.make_reserva()
        segunda = self.make_reserva(
            ambiente=self.outro_ambiente,
            inicio=INICIO_BASE + timedelta(days=1),
            fim=FIM_BASE + timedelta(days=1),
        )
        terceira = self.make_reserva(
            solicitante=self.outro_solicitante,
            inicio=INICIO_BASE + timedelta(days=2),
            fim=FIM_BASE + timedelta(days=2),
        )
        for reserva in (primeira, segunda, terceira):
            reserva.save()

        reservas_solicitante = set(
            self.solicitante.reservas_solicitadas.values_list("pk", flat=True)
        )
        reservas_ambiente = set(
            self.ambiente.reservas.values_list("pk", flat=True)
        )
        self.assertEqual(reservas_solicitante, {primeira.pk, segunda.pk})
        self.assertEqual(reservas_ambiente, {primeira.pk, terceira.pk})

    def test_exclusao_do_solicitante_referenciado_e_protegida(self):
        reserva = self.make_reserva()
        reserva.save()

        with self.assertRaises(ProtectedError):
            self.solicitante.delete()

        self.assertTrue(User.objects.filter(pk=self.solicitante.pk).exists())
        self.assertTrue(Reserva.objects.filter(pk=reserva.pk).exists())

    def test_exclusao_do_ambiente_referenciado_e_protegida(self):
        reserva = self.make_reserva()
        reserva.save()

        with self.assertRaises(ProtectedError):
            self.ambiente.delete()

        self.assertTrue(Ambiente.objects.filter(pk=self.ambiente.pk).exists())
        self.assertTrue(Reserva.objects.filter(pk=reserva.pk).exists())

    def test_exclusao_do_avaliador_referenciado_e_protegida(self):
        reserva = self.make_reserva(
            status=Reserva.Status.APROVADA,
            avaliado_por=self.avaliador,
            avaliado_em=FIM_BASE,
        )
        reserva.save()

        with self.assertRaises(ProtectedError):
            self.avaliador.delete()

        self.assertTrue(User.objects.filter(pk=self.avaliador.pk).exists())
        salva = Reserva.objects.get(pk=reserva.pk)
        self.assertEqual(salva.avaliado_por, self.avaliador)

    def test_campos_opcionais_aceitam_valores_vazios_e_preenchidos(self):
        vazia = self.make_reserva()
        vazia.save()

        self.assertEqual(vazia.observacoes, "")
        self.assertIsNone(vazia.avaliado_por)
        self.assertIsNone(vazia.avaliado_em)
        self.assertEqual(vazia.justificativa, "")

        preenchida = self.make_reserva(
            status=Reserva.Status.APROVADA,
            observacoes="Uso para apresentação acadêmica.",
            avaliado_por=self.avaliador,
            avaliado_em=INICIO_BASE,
            justificativa="Solicitação autorizada.",
        )
        preenchida.save()
        salva = Reserva.objects.get(pk=preenchida.pk)

        self.assertEqual(salva.observacoes, "Uso para apresentação acadêmica.")
        self.assertEqual(salva.avaliado_por, self.avaliador)
        self.assertEqual(salva.avaliado_em, INICIO_BASE)
        self.assertEqual(salva.justificativa, "Solicitação autorizada.")

    def test_criado_em_permanece_estavel_e_atualizado_em_avanca_em_update(self):
        criado_em = datetime(2026, 10, 29, 12, 0, tzinfo=ZoneInfo("UTC"))
        atualizado_em = criado_em + timedelta(minutes=5)

        with patch("django.db.models.fields.timezone.now", return_value=criado_em):
            reserva = self.make_reserva()
            reserva.save()

        self.assertEqual(reserva.criado_em, criado_em)
        self.assertEqual(reserva.atualizado_em, criado_em)

        with patch(
            "django.db.models.fields.timezone.now",
            return_value=atualizado_em,
        ):
            reserva.observacoes = "Registro atualizado."
            reserva.save()

        reserva.refresh_from_db()
        self.assertEqual(reserva.criado_em, criado_em)
        self.assertEqual(reserva.atualizado_em, atualizado_em)


class ReservaEquipamentoModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.solicitante = User.objects.create_user(username="solicitante-equipamento")
        cls.responsavel = User.objects.create_user(username="responsavel-equipamento")
        cls.categoria_ambiente = CategoriaAmbiente.objects.create(
            nome="Salas para equipamentos"
        )
        cls.ambiente = Ambiente.objects.create(
            codigo="REQ-AMB-001",
            nome="Sala de equipamentos",
            localizacao="Bloco E",
            capacidade=30,
            categoria=cls.categoria_ambiente,
            responsavel=cls.responsavel,
        )
        cls.categoria_equipamento = CategoriaEquipamento.objects.create(
            nome="Equipamentos de reserva"
        )
        cls.equipamento = Equipamento.objects.create(
            codigo="REQ-EQP-001",
            nome="Projetor",
            quantidade_total=5,
            categoria=cls.categoria_equipamento,
        )
        cls.outro_equipamento = Equipamento.objects.create(
            codigo="REQ-EQP-002",
            nome="Microfone",
            quantidade_total=8,
            categoria=cls.categoria_equipamento,
        )

    def make_reserva(self, dia=0):
        inicio = INICIO_BASE + timedelta(days=dia)
        return Reserva.objects.create(
            solicitante=self.solicitante,
            ambiente=self.ambiente,
            inicio=inicio,
            fim=inicio + timedelta(hours=1),
        )

    def make_item(self, reserva, quantidade=1, equipamento=None):
        return ReservaEquipamento(
            reserva=reserva,
            equipamento=equipamento or self.equipamento,
            quantidade=quantidade,
        )

    def test_criacao_e_relacionamento_many_to_many_usam_o_modelo_intermediario(self):
        reserva = self.make_reserva()
        reserva.equipamentos.add(
            self.equipamento,
            through_defaults={"quantidade": 2},
        )

        item = reserva.itens_equipamento.select_related("equipamento").get()
        self.assertEqual(item.equipamento, self.equipamento)
        self.assertEqual(item.quantidade, 2)
        self.assertEqual(
            list(reserva.equipamentos.values_list("pk", flat=True)),
            [self.equipamento.pk],
        )
        self.assertEqual(
            self.equipamento.itens_reserva.get(reserva=reserva),
            item,
        )

    def test_quantidade_zero_e_negativa_sao_rejeitadas_por_full_clean(self):
        reserva = self.make_reserva()

        for quantidade in (0, -1):
            with self.subTest(quantidade=quantidade):
                item = self.make_item(reserva, quantidade=quantidade)
                with self.assertRaises(ValidationError) as error:
                    item.full_clean()
                self.assertIn("quantidade", error.exception.message_dict)

    def test_constraint_sql_rejeita_quantidade_zero_e_negativa(self):
        reserva = self.make_reserva()

        for quantidade in (0, -1):
            with self.subTest(quantidade=quantidade):
                antes = ReservaEquipamento.objects.count()
                with self.assertRaises(IntegrityError):
                    with transaction.atomic():
                        self.make_item(reserva, quantidade=quantidade).save()
                self.assertEqual(ReservaEquipamento.objects.count(), antes)

    def test_par_reserva_equipamento_duplicado_falha_na_validacao_e_no_banco(self):
        reserva = self.make_reserva()
        self.make_item(reserva, quantidade=1).save()
        duplicado = self.make_item(reserva, quantidade=3)

        with self.assertRaises(ValidationError):
            duplicado.full_clean()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                duplicado.save()
        self.assertEqual(ReservaEquipamento.objects.count(), 1)

    def test_reserva_aceita_varios_equipamentos_e_equipamento_varias_reservas(self):
        primeira_reserva = self.make_reserva(dia=0)
        segunda_reserva = self.make_reserva(dia=1)
        ReservaEquipamento.objects.create(
            reserva=primeira_reserva,
            equipamento=self.equipamento,
            quantidade=2,
        )
        ReservaEquipamento.objects.create(
            reserva=primeira_reserva,
            equipamento=self.outro_equipamento,
            quantidade=1,
        )
        ReservaEquipamento.objects.create(
            reserva=segunda_reserva,
            equipamento=self.equipamento,
            quantidade=4,
        )

        self.assertSetEqual(
            set(primeira_reserva.equipamentos.values_list("pk", flat=True)),
            {self.equipamento.pk, self.outro_equipamento.pk},
        )
        self.assertSetEqual(
            set(self.equipamento.reservas.values_list("pk", flat=True)),
            {primeira_reserva.pk, segunda_reserva.pk},
        )
        self.assertEqual(primeira_reserva.itens_equipamento.count(), 2)

    def test_equipamento_da_reserva_protege_exclusao_da_reserva(self):
        reserva = self.make_reserva()
        item = self.make_item(reserva)
        item.save()

        with self.assertRaises(ProtectedError):
            reserva.delete()

        self.assertTrue(Reserva.objects.filter(pk=reserva.pk).exists())
        self.assertTrue(ReservaEquipamento.objects.filter(pk=item.pk).exists())

    def test_equipamento_da_reserva_protege_exclusao_do_equipamento(self):
        reserva = self.make_reserva()
        item = self.make_item(reserva)
        item.save()

        with self.assertRaises(ProtectedError):
            self.equipamento.delete()

        self.assertTrue(Equipamento.objects.filter(pk=self.equipamento.pk).exists())
        self.assertTrue(ReservaEquipamento.objects.filter(pk=item.pk).exists())


class BloqueioAmbienteModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.criador = User.objects.create_user(username="criador-bloqueio")
        cls.responsavel = User.objects.create_user(username="responsavel-bloqueio")
        cls.categoria = CategoriaAmbiente.objects.create(
            nome="Ambientes para bloqueios"
        )
        cls.ambiente = Ambiente.objects.create(
            codigo="BLOQ-AMB-001",
            nome="Laboratório de bloqueios",
            localizacao="Bloco B",
            capacidade=25,
            categoria=cls.categoria,
            responsavel=cls.responsavel,
        )
        cls.inicio_utc = datetime(2026, 11, 3, 12, 30, tzinfo=ZoneInfo("UTC"))
        cls.fim_utc = datetime(2026, 11, 3, 14, 0, tzinfo=ZoneInfo("UTC"))

    def make_bloqueio(self, **overrides):
        values = {
            "ambiente": self.ambiente,
            "inicio": self.inicio_utc,
            "fim": self.fim_utc,
            "motivo": "Manutenção programada",
            "criado_por": self.criador,
        }
        values.update(overrides)
        return BloqueioAmbiente(**values)

    def test_bloqueio_persiste_com_relacoes_datetimes_conscientes_e_horario_local(self):
        bloqueio = self.make_bloqueio()
        bloqueio.full_clean()
        bloqueio.save()
        salvo = BloqueioAmbiente.objects.select_related(
            "ambiente", "criado_por"
        ).get(pk=bloqueio.pk)

        self.assertEqual(salvo.ambiente, self.ambiente)
        self.assertEqual(salvo.criado_por, self.criador)
        self.assertTrue(timezone.is_aware(salvo.inicio))
        self.assertTrue(timezone.is_aware(salvo.fim))
        self.assertEqual(salvo.inicio, self.inicio_utc)
        self.assertEqual(salvo.fim, self.fim_utc)
        self.assertEqual(
            list(self.ambiente.bloqueios.values_list("pk", flat=True)),
            [salvo.pk],
        )
        self.assertEqual(
            list(self.criador.bloqueios_criados.values_list("pk", flat=True)),
            [salvo.pk],
        )
        representacao = str(salvo)
        self.assertIn("Manutenção programada", representacao)
        self.assertIn("03/11/2026 09:30", representacao)
        self.assertIn("03/11/2026 11:00", representacao)

    def test_ambiente_criador_e_motivo_sao_obrigatorios_na_validacao(self):
        for campo in ("ambiente", "criado_por", "motivo"):
            with self.subTest(campo=campo):
                valor = "" if campo == "motivo" else None
                invalido = self.make_bloqueio(**{campo: valor})
                with self.assertRaises(ValidationError) as error:
                    invalido.full_clean()
                self.assertIn(campo, error.exception.message_dict)

    def test_ambiente_e_criador_sao_obrigatorios_no_banco(self):
        for campo in ("ambiente", "criado_por"):
            with self.subTest(campo=campo):
                antes = BloqueioAmbiente.objects.count()
                with self.assertRaises(IntegrityError):
                    with transaction.atomic():
                        self.make_bloqueio(**{campo: None}).save()
                self.assertEqual(BloqueioAmbiente.objects.count(), antes)

    def test_clean_e_full_clean_rejeitam_intervalo_igual_ou_invertido(self):
        intervalos_invalidos = (
            (self.inicio_utc, self.inicio_utc),
            (self.fim_utc, self.inicio_utc),
        )

        for inicio, fim in intervalos_invalidos:
            with self.subTest(inicio=inicio, fim=fim):
                bloqueio = self.make_bloqueio(inicio=inicio, fim=fim)
                with self.assertRaises(ValidationError) as clean_error:
                    bloqueio.clean()
                self.assertIn("fim", clean_error.exception.message_dict)

                with self.assertRaises(ValidationError) as full_clean_error:
                    bloqueio.full_clean()
                self.assertIn("fim", full_clean_error.exception.message_dict)

    def test_check_de_intervalo_rejeita_fim_igual_ou_anterior_sem_persistir(self):
        intervalos_invalidos = (
            (self.inicio_utc, self.inicio_utc),
            (self.fim_utc, self.inicio_utc),
        )

        for inicio, fim in intervalos_invalidos:
            with self.subTest(inicio=inicio, fim=fim):
                antes = BloqueioAmbiente.objects.count()
                with self.assertRaises(IntegrityError):
                    with transaction.atomic():
                        self.make_bloqueio(inicio=inicio, fim=fim).save()
                self.assertEqual(BloqueioAmbiente.objects.count(), antes)

    def test_bloqueio_protege_exclusao_do_ambiente(self):
        bloqueio = self.make_bloqueio()
        bloqueio.save()

        with self.assertRaises(ProtectedError):
            self.ambiente.delete()

        self.assertTrue(Ambiente.objects.filter(pk=self.ambiente.pk).exists())
        self.assertTrue(BloqueioAmbiente.objects.filter(pk=bloqueio.pk).exists())

    def test_bloqueio_protege_exclusao_do_usuario_criador(self):
        bloqueio = self.make_bloqueio()
        bloqueio.save()

        with self.assertRaises(ProtectedError):
            self.criador.delete()

        self.assertTrue(User.objects.filter(pk=self.criador.pk).exists())
        self.assertTrue(BloqueioAmbiente.objects.filter(pk=bloqueio.pk).exists())
