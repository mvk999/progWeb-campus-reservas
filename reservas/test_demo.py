"""Testes dos comandos de grupos e dados sintéticos da C1.11."""

from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.utils.crypto import get_random_string

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)
from reservas.models import (
    BloqueioAmbiente,
    Reserva,
    ReservaEquipamento,
    ReservaStatus,
)


User = get_user_model()
DEMO_USER_PREFIX = "demo.c111."


class PopularDemoCommandTests(TestCase):
    @staticmethod
    def populate_demo():
        call_command("popular_demo", stdout=StringIO(), verbosity=0)

    def test_cria_dados_sinteticos_relacionados_sem_credenciais_utilizaveis(self):
        unrelated_user = User.objects.create_user(
            username="usuario-real-preservado",
            email="pessoa@example.invalid",
        )
        unrelated_category = CategoriaAmbiente.objects.create(
            nome="Categoria não demo",
            descricao="Registro preexistente.",
        )

        self.populate_demo()

        demo_users = User.objects.filter(username__startswith=DEMO_USER_PREFIX)
        self.assertEqual(demo_users.count(), 5)
        administrator = demo_users.get(username=f"{DEMO_USER_PREFIX}admin")
        self.assertFalse(administrator.is_staff)
        self.assertFalse(administrator.is_superuser)
        self.assertFalse(administrator.has_usable_password())
        self.assertTrue(administrator.groups.filter(name="Administrador").exists())

        self.assertFalse(
            User.objects.filter(
                is_superuser=True,
                username__startswith=DEMO_USER_PREFIX,
            ).exists()
        )
        self.assertEqual(
            CategoriaAmbiente.objects.filter(
                nome__startswith="DEMO C1.11"
            ).count(),
            3,
        )
        self.assertEqual(
            CategoriaEquipamento.objects.filter(
                nome__startswith="DEMO C1.11"
            ).count(),
            3,
        )
        self.assertEqual(Ambiente.objects.filter(codigo__startswith="DEMO-").count(), 3)
        self.assertEqual(
            Equipamento.objects.filter(codigo__startswith="DEMO-").count(), 3
        )

        demo_reservations = Reserva.objects.filter(
            observacoes__startswith="DEMO:C1.11:reserva:"
        )
        self.assertEqual(demo_reservations.count(), 5)
        self.assertEqual(
            set(demo_reservations.values_list("status", flat=True)),
            set(ReservaStatus.values),
        )
        for reservation in demo_reservations:
            self.assertLess(reservation.inicio, reservation.fim)
            self.assertTrue(timezone.is_aware(reservation.inicio))
            self.assertTrue(timezone.is_aware(reservation.fim))
            self.assertTrue(
                reservation.solicitante.groups.filter(name="Solicitante").exists()
            )
            self.assertTrue(reservation.ambiente.codigo.startswith("DEMO-AMB-"))
            self.assertTrue(reservation.itens_equipamento.exists())

        demo_items = ReservaEquipamento.objects.filter(
            reserva__observacoes__startswith="DEMO:C1.11:reserva:"
        )
        self.assertGreaterEqual(demo_items.count(), 5)
        self.assertTrue(all(item.quantidade >= 1 for item in demo_items))
        self.assertEqual(
            BloqueioAmbiente.objects.filter(
                motivo="DEMO:C1.11:bloqueio:manutencao"
            ).count(),
            1,
        )
        block = BloqueioAmbiente.objects.get(motivo="DEMO:C1.11:bloqueio:manutencao")
        self.assertLess(block.inicio, block.fim)
        self.assertTrue(block.criado_por.groups.filter(name="Responsável").exists())

        unrelated_user.refresh_from_db()
        unrelated_category.refresh_from_db()
        self.assertEqual(unrelated_user.email, "pessoa@example.invalid")
        self.assertEqual(unrelated_category.descricao, "Registro preexistente.")

    def test_reexecucao_nao_duplica_nem_sobrescreve_registros_existentes(self):
        unrelated_user = User.objects.create_user(username="usuario-fora-da-demo")
        unrelated_user.first_name = "Nome preservado"
        unrelated_user.save(update_fields=("first_name",))
        self.populate_demo()

        reservation = Reserva.objects.get(
            observacoes="DEMO:C1.11:reserva:pendente"
        )
        reservation.justificativa = "Edição manual preservada."
        reservation.save(update_fields=("justificativa",))
        model_counts = {
            model: model.objects.count()
            for model in (
                User,
                CategoriaAmbiente,
                Ambiente,
                CategoriaEquipamento,
                Equipamento,
                Reserva,
                ReservaEquipamento,
                BloqueioAmbiente,
            )
        }

        self.populate_demo()

        self.assertEqual(
            {model: model.objects.count() for model in model_counts}, model_counts
        )
        reservation.refresh_from_db()
        unrelated_user.refresh_from_db()
        self.assertEqual(reservation.justificativa, "Edição manual preservada.")
        self.assertEqual(unrelated_user.first_name, "Nome preservado")

    def test_colisao_de_chave_natural_real_falha_sem_alterar_o_registro(self):
        existing = CategoriaAmbiente.objects.create(
            nome="DEMO C1.11 — Sala de aula",
            descricao="Categoria real preexistente.",
        )

        with self.assertRaisesMessage(CommandError, "registro não sintético"):
            self.populate_demo()

        existing.refresh_from_db()
        self.assertEqual(existing.descricao, "Categoria real preexistente.")
        self.assertFalse(
            User.objects.filter(username__startswith=DEMO_USER_PREFIX).exists()
        )

    def test_conta_reservada_privilegiada_e_preservada_sem_associacao_ao_grupo(self):
        existing_password = get_random_string(32)
        account = User.objects.create_user(
            username=f"{DEMO_USER_PREFIX}admin",
            email=f"{DEMO_USER_PREFIX}admin@example.invalid",
            first_name="Administração",
            last_name="Campus Reservas",
            password=existing_password,
            is_staff=True,
        )

        with self.assertRaisesMessage(CommandError, "conta privilegiada"):
            self.populate_demo()

        account.refresh_from_db()
        self.assertTrue(account.is_staff)
        self.assertFalse(account.is_superuser)
        self.assertTrue(account.check_password(existing_password))
        self.assertFalse(account.groups.filter(name="Administrador").exists())

    def test_dados_demo_permitem_usar_filtro_http_de_reservas(self):
        self.populate_demo()
        administrator = User.objects.create_superuser(
            username="admin-filter-demo",
            password=None,
        )
        self.client.force_login(administrator)

        response = self.client.get(
            reverse("admin:reservas_reserva_changelist"),
            {"status__exact": ReservaStatus.APROVADA},
        )

        self.assertEqual(response.status_code, 200)
        results = list(response.context["cl"].result_list)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status, ReservaStatus.APROVADA)
        self.assertEqual(
            results[0].observacoes,
            "DEMO:C1.11:reserva:aprovada",
        )
