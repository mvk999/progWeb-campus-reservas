"""Modelo de usuário do Campus Reservas."""

from django.contrib.auth.models import AbstractUser


class Usuario(AbstractUser):
    """Usuário do sistema com os campos e comportamentos nativos do Django."""

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"
