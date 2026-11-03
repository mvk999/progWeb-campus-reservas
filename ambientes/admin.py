"""Registro das entidades de ambientes no Django Admin."""

from django.contrib import admin

from .models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)


admin.site.register(CategoriaAmbiente)
admin.site.register(Ambiente)
admin.site.register(CategoriaEquipamento)
admin.site.register(Equipamento)
