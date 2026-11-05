"""Popula dados sintéticos do Campus Reservas sem apagar registros."""

from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import BaseCommand, CommandError, call_command
from django.db import transaction
from django.utils import timezone

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


DEMO_DESCRIPTION = "Dado sintético de demonstração Campus Reservas C1.11."
DEMO_USER_PREFIX = "demo.c111."


class Command(BaseCommand):
    help = "Cria dados fictícios para demonstrar o Campus Reservas."

    @transaction.atomic
    def handle(self, *args, **options):
        # O comando é autossuficiente, mas não altera usuários nem outros grupos.
        call_command("configurar_perfis", stdout=StringIO())
        self.created = {}

        groups = {
            group.name: group
            for group in Group.objects.filter(
                name__in=("Administrador", "Responsável", "Solicitante")
            )
        }
        users = self._create_users(groups)
        _, environments = self._create_environments(users)
        equipment = self._create_equipment()
        reservations = self._create_reservations(users, environments)
        self._create_reservation_equipment(reservations, equipment)
        self._create_block(environments, users)

        summary = ", ".join(
            f"{name}: {count} novo(s)"
            for name, count in self.created.items()
        )
        if not summary:
            summary = "nenhum registro novo"
        self.stdout.write(
            self.style.SUCCESS(
                "Dados de demonstração preparados sem remover ou atualizar "
                f"registros existentes ({summary})."
            )
        )

    def _record(self, model, lookup, defaults, marker_field, marker_value):
        try:
            instance = model.objects.get(**lookup)
        except model.DoesNotExist:
            instance = model.objects.create(**lookup, **defaults)
            self.created[model._meta.verbose_name_plural] = (
                self.created.get(model._meta.verbose_name_plural, 0) + 1
            )
            return instance
        except model.MultipleObjectsReturned as exc:
            raise CommandError(
                f"Há mais de um registro para a chave sintética de "
                f"{model._meta.label}: {lookup}. Nenhum dado foi removido."
            ) from exc

        if getattr(instance, marker_field) != marker_value:
            raise CommandError(
                f"A chave reservada para demonstração {lookup} já pertence a "
                f"um registro não sintético de {model._meta.label}. "
                "O comando não alterou esse registro."
            )
        return instance

    def _user(self, username, email, first_name, last_name, group):
        user_model = get_user_model()
        try:
            user = user_model.objects.get(username=username)
        except user_model.DoesNotExist:
            user = user_model(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_staff=False,
                is_superuser=False,
            )
            user.set_unusable_password()
            user.save()
            self.created["usuários"] = self.created.get("usuários", 0) + 1
        except user_model.MultipleObjectsReturned as exc:
            raise CommandError(
                f"Há mais de uma conta com o nome reservado {username}."
            ) from exc
        else:
            if (
                user.email != email
                or user.first_name != first_name
                or user.last_name != last_name
                or user.is_staff
                or user.is_superuser
                or user.has_usable_password()
            ):
                raise CommandError(
                    f"O nome de usuário reservado {username} já pertence a "
                    "uma conta privilegiada ou que não corresponde à identidade "
                    "sintética. A conta existente foi preservada e não foi associada "
                    "ao grupo de demonstração."
                )

        # Adiciona somente o grupo da demonstração e preserva outros grupos.
        user.groups.add(group)
        return user

    def _create_users(self, groups):
        identities = (
            ("admin", "Administração", "Campus Reservas", "Administrador"),
            ("responsavel.01", "Responsável", "Demonstração 01", "Responsável"),
            ("responsavel.02", "Responsável", "Demonstração 02", "Responsável"),
            ("solicitante.01", "Solicitante", "Demonstração 01", "Solicitante"),
            ("solicitante.02", "Solicitante", "Demonstração 02", "Solicitante"),
        )
        result = {}
        for suffix, first_name, last_name, group_name in identities:
            username = DEMO_USER_PREFIX + suffix
            email = f"{username}@example.invalid"
            result[suffix] = self._user(
                username,
                email,
                first_name,
                last_name,
                groups[group_name],
            )
        return result

    def _create_environments(self, users):
        categories = {}
        for suffix, label in (
            ("sala", "Sala de aula"),
            ("laboratorio", "Laboratório de informática"),
            ("auditorio", "Auditório"),
        ):
            name = f"DEMO C1.11 — {label}"
            categories[suffix] = self._record(
                CategoriaAmbiente,
                {"nome": name},
                {"descricao": DEMO_DESCRIPTION},
                "descricao",
                DEMO_DESCRIPTION,
            )

        environment_specs = (
            (
                "DEMO-AMB-01",
                "Sala de aula de demonstração",
                "sala",
                "responsavel.01",
                32,
                "Bloco DEMO — Sala 01",
            ),
            (
                "DEMO-AMB-02",
                "Laboratório de informática de demonstração",
                "laboratorio",
                "responsavel.01",
                24,
                "Bloco DEMO — Laboratório 02",
            ),
            (
                "DEMO-AMB-03",
                "Auditório de demonstração",
                "auditorio",
                "responsavel.02",
                120,
                "Bloco DEMO — Auditório 03",
            ),
        )
        environments = {}
        for code, name, category, responsible, capacity, location in environment_specs:
            environments[code] = self._record(
                Ambiente,
                {"codigo": code},
                {
                    "nome": name,
                    "descricao": DEMO_DESCRIPTION,
                    "localizacao": location,
                    "capacidade": capacity,
                    "ativo": True,
                    "categoria": categories[category],
                    "responsavel": users[responsible],
                },
                "descricao",
                DEMO_DESCRIPTION,
            )
        return categories, environments

    def _create_equipment(self):
        category_specs = (
            ("audiovisual", "DEMO C1.11 — Audiovisual"),
            ("informatica", "DEMO C1.11 — Informática"),
            ("audio", "DEMO C1.11 — Áudio"),
        )
        equipment_categories = {}
        for suffix, name in category_specs:
            equipment_categories[suffix] = self._record(
                CategoriaEquipamento,
                {"nome": name},
                {"descricao": DEMO_DESCRIPTION},
                "descricao",
                DEMO_DESCRIPTION,
            )

        equipment_specs = (
            ("DEMO-EQP-01", "Projetor de demonstração", "audiovisual", 5, True),
            ("DEMO-EQP-02", "Notebook de demonstração", "informatica", 8, True),
            ("DEMO-EQP-03", "Microfone de demonstração", "audio", 6, True),
            (
                "DEMO-EQP-04",
                "Projetor inativo de demonstração",
                "audiovisual",
                1,
                False,
            ),
        )
        equipment = {}
        for code, name, category, quantity, active in equipment_specs:
            equipment[code] = self._record(
                Equipamento,
                {"codigo": code},
                {
                    "nome": name,
                    "descricao": DEMO_DESCRIPTION,
                    "quantidade_total": quantity,
                    "ativo": active,
                    "categoria": equipment_categories[category],
                },
                "descricao",
                DEMO_DESCRIPTION,
            )
        return equipment

    @staticmethod
    def _reservation_start_times():
        now = timezone.localtime()
        next_ten = now.replace(hour=10, minute=0, second=0, microsecond=0)
        if next_ten <= now:
            next_ten += timedelta(days=1)
        return {
            ReservaStatus.PENDENTE: next_ten,
            ReservaStatus.APROVADA: next_ten + timedelta(days=1),
            ReservaStatus.REJEITADA: next_ten + timedelta(days=2),
            ReservaStatus.CANCELADA: next_ten + timedelta(days=3),
            ReservaStatus.CONCLUIDA: next_ten - timedelta(days=7),
        }

    def _create_reservations(self, users, environments):
        reservation_specs = (
            (
                ReservaStatus.PENDENTE,
                "DEMO-AMB-01",
                "solicitante.01",
                "responsavel.01",
            ),
            (
                ReservaStatus.APROVADA,
                "DEMO-AMB-02",
                "solicitante.02",
                "responsavel.01",
            ),
            (
                ReservaStatus.REJEITADA,
                "DEMO-AMB-03",
                "solicitante.01",
                "responsavel.02",
            ),
            (
                ReservaStatus.CANCELADA,
                "DEMO-AMB-01",
                "solicitante.02",
                "responsavel.01",
            ),
            (
                ReservaStatus.CONCLUIDA,
                "DEMO-AMB-02",
                "solicitante.01",
                "responsavel.01",
            ),
        )
        start_times = self._reservation_start_times()
        reservations = {}
        for status, environment_code, requester, evaluator in reservation_specs:
            marker = f"DEMO:C1.11:reserva:{status.lower()}"
            start = start_times[status]
            lookup = {"observacoes": marker}
            reservation, created = self._find_or_create_reservation(
                lookup,
                {
                    "solicitante": users[requester],
                    "ambiente": environments[environment_code],
                    "inicio": start,
                    "fim": start + timedelta(hours=2),
                    "status": status,
                    "avaliado_por": (
                        users[evaluator]
                        if status in (ReservaStatus.APROVADA, ReservaStatus.REJEITADA)
                        else None
                    ),
                    "avaliado_em": (
                        timezone.now()
                        if status in (ReservaStatus.APROVADA, ReservaStatus.REJEITADA)
                        else None
                    ),
                    "justificativa": (
                        DEMO_DESCRIPTION
                        if status == ReservaStatus.REJEITADA
                        else ""
                    ),
                },
            )
            if created:
                label = Reserva._meta.verbose_name_plural
                self.created[label] = self.created.get(label, 0) + 1
            reservations[status] = reservation
        return reservations

    def _find_or_create_reservation(self, lookup, defaults):
        try:
            reservation = Reserva.objects.get(**lookup)
        except Reserva.DoesNotExist:
            reservation = Reserva.objects.create(**lookup, **defaults)
            return reservation, True
        except Reserva.MultipleObjectsReturned as exc:
            raise CommandError(
                f"Há reservas duplicadas com o marcador {lookup['observacoes']}."
            ) from exc

        expected = (
            "solicitante",
            "ambiente",
            "status",
        )
        if any(
            getattr(reservation, field) != defaults[field]
            for field in expected
        ) or reservation.inicio >= reservation.fim:
            raise CommandError(
                f"A reserva sintética {lookup['observacoes']} foi alterada ou "
                "está inconsistente. Ela foi preservada; corrija-a manualmente."
            )
        return reservation, False

    def _create_reservation_equipment(self, reservations, equipment):
        associations = (
            (ReservaStatus.PENDENTE, "DEMO-EQP-01", 1),
            (ReservaStatus.APROVADA, "DEMO-EQP-01", 2),
            (ReservaStatus.APROVADA, "DEMO-EQP-03", 1),
            (ReservaStatus.REJEITADA, "DEMO-EQP-02", 2),
            (ReservaStatus.CANCELADA, "DEMO-EQP-03", 1),
            (ReservaStatus.CONCLUIDA, "DEMO-EQP-02", 1),
        )
        for status, equipment_code, quantity in associations:
            item, created = ReservaEquipamento.objects.get_or_create(
                reserva=reservations[status],
                equipamento=equipment[equipment_code],
                defaults={"quantidade": quantity},
            )
            if created:
                label = ReservaEquipamento._meta.verbose_name_plural
                self.created[label] = self.created.get(label, 0) + 1
            elif item.quantidade != quantity:
                raise CommandError(
                    "Uma associação sintética de equipamento foi alterada; "
                    "o comando a preservou e não substituiu sua quantidade."
                )

    def _create_block(self, environments, users):
        start = self._reservation_start_times()[ReservaStatus.APROVADA] + timedelta(
            days=5
        )
        marker = "DEMO:C1.11:bloqueio:manutencao"
        block, created = self._find_or_create_block(
            marker,
            {
                "ambiente": environments["DEMO-AMB-03"],
                "inicio": start + timedelta(hours=3),
                "fim": start + timedelta(hours=6),
                "criado_por": users["responsavel.02"],
            },
        )
        if created:
            label = BloqueioAmbiente._meta.verbose_name_plural
            self.created[label] = self.created.get(label, 0) + 1
        return block

    def _find_or_create_block(self, marker, defaults):
        try:
            block = BloqueioAmbiente.objects.get(motivo=marker)
        except BloqueioAmbiente.DoesNotExist:
            block = BloqueioAmbiente.objects.create(motivo=marker, **defaults)
            return block, True
        except BloqueioAmbiente.MultipleObjectsReturned as exc:
            raise CommandError(
                f"Há bloqueios duplicados com o marcador {marker}."
            ) from exc

        if (
            block.ambiente_id != defaults["ambiente"].pk
            or block.criado_por_id != defaults["criado_por"].pk
            or block.inicio >= block.fim
        ):
            raise CommandError(
                f"O bloqueio sintético {marker} foi alterado ou está inconsistente. "
                "Ele foi preservado; corrija-o manualmente."
            )
        return block, False
