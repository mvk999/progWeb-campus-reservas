"""Cria grupos iniciais e sincroniza sua matriz de permissões do Admin."""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)
from reservas.models import BloqueioAmbiente, Reserva, ReservaEquipamento


ADMINISTRADOR = "Administrador"
RESPONSAVEL = "Responsável"
SOLICITANTE = "Solicitante"

DOMAIN_MODELS = (
    CategoriaAmbiente,
    Ambiente,
    CategoriaEquipamento,
    Equipamento,
    Reserva,
    ReservaEquipamento,
    BloqueioAmbiente,
)

# O comando administra as permissões padrão destes modelos. Permissões
# customizadas e permissões de outros aplicativos são preservadas.
MANAGED_MODELS = DOMAIN_MODELS + (get_user_model(), Group, Permission)
STANDARD_ACTIONS = ("add", "view", "change", "delete")


class Command(BaseCommand):
    help = (
        "Cria os grupos Campus Reservas e configura permissões administrativas "
        "mínimas."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        content_type_ids = {
            ContentType.objects.get_for_model(model).pk for model in MANAGED_MODELS
        }
        managed_codenames = {
            f"{action}_{model._meta.model_name}"
            for model in MANAGED_MODELS
            for action in STANDARD_ACTIONS
        }
        available_permissions = {
            (permission.content_type_id, permission.codename): permission
            for permission in Permission.objects.filter(
                content_type_id__in=content_type_ids,
                codename__in=managed_codenames,
            )
        }

        administrator_permissions = set()
        for model in DOMAIN_MODELS:
            content_type = ContentType.objects.get_for_model(model)
            for action in STANDARD_ACTIONS:
                key = (content_type.pk, f"{action}_{model._meta.model_name}")
                permission = available_permissions.get(key)
                if permission is None:
                    raise CommandError(
                        "Permissões do Django ainda não foram criadas para "
                        f"{model._meta.label}. Execute `python manage.py migrate` "
                        "e tente novamente."
                    )
                administrator_permissions.add(permission)

        desired_permissions = {
            ADMINISTRADOR: administrator_permissions,
            RESPONSAVEL: set(),
            SOLICITANTE: set(),
        }
        managed_permission_ids = {
            permission.pk for permission in available_permissions.values()
        }

        for group_name, desired in desired_permissions.items():
            group, created = Group.objects.get_or_create(name=group_name)
            current_managed = set(
                group.permissions.filter(pk__in=managed_permission_ids)
            )
            to_remove = current_managed - desired
            to_add = desired - current_managed
            if to_remove:
                group.permissions.remove(*to_remove)
            if to_add:
                group.permissions.add(*to_add)

            status = "criado" if created else "existente"
            self.stdout.write(
                f"Grupo {group_name}: {status}; "
                f"{len(to_add)} permissões adicionadas, "
                f"{len(to_remove)} permissões padrão removidas."
            )

        self.stdout.write(self.style.SUCCESS("Perfis configurados."))
