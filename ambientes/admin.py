"""Listagens e buscas administrativas de ambientes e equipamentos."""

from django.contrib import admin

from .models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)


@admin.register(CategoriaAmbiente)
class CategoriaAmbienteAdmin(admin.ModelAdmin):
    list_display = ("nome",)
    search_fields = ("nome",)
    ordering = ("nome",)


@admin.register(Ambiente)
class AmbienteAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "nome",
        "categoria",
        "localizacao",
        "capacidade",
        "ativo",
        "responsavel",
    )
    list_filter = (
        "categoria",
        "ativo",
        ("responsavel", admin.RelatedOnlyFieldListFilter),
    )
    search_fields = ("codigo", "nome", "localizacao")
    ordering = ("codigo",)
    list_select_related = ("categoria", "responsavel")
    list_per_page = 25


@admin.register(CategoriaEquipamento)
class CategoriaEquipamentoAdmin(admin.ModelAdmin):
    list_display = ("nome",)
    search_fields = ("nome",)
    ordering = ("nome",)


@admin.register(Equipamento)
class EquipamentoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nome", "categoria", "quantidade_total", "ativo")
    list_filter = ("categoria", "ativo")
    search_fields = ("codigo", "nome")
    ordering = ("codigo",)
    list_select_related = ("categoria",)
    list_per_page = 25
