"""Permissões da API de reservas."""

from rest_framework.permissions import BasePermission

from usuarios.perfis import PERFIL_ADMINISTRADOR, PERFIL_RESPONSAVEL, perfil_do_usuario


class EhGestor(BasePermission):
    """Libera a gestão para responsáveis e administradores."""

    message = "Apenas responsáveis e administradores podem gerenciar reservas."

    def has_permission(self, request, view):
        return perfil_do_usuario(request.user) in (
            PERFIL_RESPONSAVEL,
            PERFIL_ADMINISTRADOR,
        )
