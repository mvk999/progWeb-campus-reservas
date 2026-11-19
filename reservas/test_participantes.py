"""Testes dos campos de finalidade e participantes da reserva."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from ambientes.models import Ambiente, CategoriaAmbiente

from .models import Reserva


User = get_user_model()


class ReservaParticipantesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.solicitante = User.objects.create_user(username="solicitante-part")
        responsavel = User.objects.create_user(username="responsavel-part")
        categoria = CategoriaAmbiente.objects.create(nome="Salas participantes")
        cls.ambiente = Ambiente.objects.create(
            codigo="PART-001",
            nome="Sala de 20 lugares",
            localizacao="Bloco P",
            capacidade=20,
            categoria=categoria,
            responsavel=responsavel,
        )
        # Datas relativas a "agora" para o teste não depender do dia em que roda.
        cls.inicio = timezone.now().replace(microsecond=0) + timedelta(days=3)
        cls.fim = cls.inicio + timedelta(hours=2)

    def make_reserva(self, **overrides):
        values = {
            "solicitante": self.solicitante,
            "ambiente": self.ambiente,
            "inicio": self.inicio,
            "fim": self.fim,
            "finalidade": "Reunião do grupo de estudos",
        }
        values.update(overrides)
        return Reserva(**values)

    def test_campos_sao_opcionais(self):
        reserva = self.make_reserva(finalidade="", participantes=None)

        reserva.full_clean()

    def test_aceita_participantes_ate_a_capacidade(self):
        for participantes in (1, 20):
            with self.subTest(participantes=participantes):
                self.make_reserva(participantes=participantes).full_clean()

    def test_recusa_participantes_acima_da_capacidade(self):
        reserva = self.make_reserva(participantes=21)

        with self.assertRaises(ValidationError) as contexto:
            reserva.full_clean()

        self.assertIn("participantes", contexto.exception.message_dict)
        self.assertIn(
            "no máximo 20 participante(s)",
            contexto.exception.message_dict["participantes"][0],
        )

    def test_recusa_zero_participantes(self):
        reserva = self.make_reserva(participantes=0)

        with self.assertRaises(ValidationError) as contexto:
            reserva.full_clean()

        self.assertIn("participantes", contexto.exception.message_dict)

    def test_banco_recusa_zero_participantes(self):
        reserva = self.make_reserva(participantes=0)

        with self.assertRaises(IntegrityError), transaction.atomic():
            reserva.save()
