"""Registro das entidades de reservas no Django Admin."""

from django.contrib import admin

from .models import BloqueioAmbiente, Reserva, ReservaEquipamento


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    readonly_fields = ("criado_em", "atualizado_em")
    fieldsets = (
        (
            "Solicitação",
            {
                "fields": (
                    "solicitante",
                    "ambiente",
                    "inicio",
                    "fim",
                    "status",
                    "observacoes",
                )
            },
        ),
        (
            "Avaliação",
            {"fields": ("avaliado_por", "avaliado_em", "justificativa")},
        ),
        (
            "Auditoria",
            {"fields": ("criado_em", "atualizado_em")},
        ),
    )


admin.site.register(ReservaEquipamento)
admin.site.register(BloqueioAmbiente)
