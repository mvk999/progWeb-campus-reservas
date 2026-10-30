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

from ambientes.models import Ambiente, CategoriaAmbiente

from .models import Reserva


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
