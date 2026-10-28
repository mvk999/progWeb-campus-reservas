"""Configuração administrativa do usuário customizado."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


admin.site.register(Usuario, UserAdmin)
