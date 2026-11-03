"""Listagens, filtros e operações administrativas de reservas."""

from django.contrib import admin
from django.contrib import messages
from django.contrib.admin.actions import delete_selected
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import (
    RESERVA_CONCLUIDA_DELETE_ERROR,
    BloqueioAmbiente,
    Reserva,
    ReservaEquipamento,
    ReservaStatus,
)


class ReservaEquipamentoInline(admin.TabularInline):
    model = ReservaEquipamento
    fields = ("equipamento", "quantidade")
    extra = 1


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    actions = ("delete_selected_reservas",)
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
    list_display = (
        "solicitante",
        "ambiente",
        "inicio",
        "fim",
        "status",
        "criado_em",
    )
    list_filter = (
        "status",
        ("ambiente", admin.RelatedOnlyFieldListFilter),
        ("solicitante", admin.RelatedOnlyFieldListFilter),
    )
    search_fields = (
        "ambiente__codigo",
        "ambiente__nome",
        "solicitante__username",
        "solicitante__first_name",
        "solicitante__last_name",
        "solicitante__email",
    )
    ordering = ("-criado_em",)
    date_hierarchy = "criado_em"
    list_select_related = ("solicitante", "ambiente")
    list_per_page = 25
    inlines = (ReservaEquipamentoInline,)

    def delete_view(self, request, object_id, extra_context=None):
        reserva = self.get_object(request, object_id)
        if (
            reserva is not None
            and self.has_delete_permission(request, reserva)
            and reserva.status == ReservaStatus.CONCLUIDA
        ):
            self.message_user(
                request,
                RESERVA_CONCLUIDA_DELETE_ERROR,
                level=messages.ERROR,
            )
            return HttpResponseRedirect(reverse("admin:index"))
        return super().delete_view(request, object_id, extra_context)

    @admin.action(
        permissions=("delete",),
        description="Excluir reservas selecionadas",
    )
    def delete_selected_reservas(self, request, queryset):
        mensagem_protecao = (
            RESERVA_CONCLUIDA_DELETE_ERROR
            + " Nenhuma reserva selecionada foi excluída."
        )
        if queryset.filter(status=ReservaStatus.CONCLUIDA).exists():
            self.message_user(request, mensagem_protecao, level=messages.ERROR)
            return None
        return delete_selected(self, request, queryset)


@admin.register(ReservaEquipamento)
class ReservaEquipamentoAdmin(admin.ModelAdmin):
    list_display = ("reserva", "equipamento", "quantidade")
    list_filter = (
        ("reserva", admin.RelatedOnlyFieldListFilter),
        ("equipamento", admin.RelatedOnlyFieldListFilter),
    )
    search_fields = (
        "equipamento__codigo",
        "equipamento__nome",
        "reserva__ambiente__codigo",
        "reserva__ambiente__nome",
        "reserva__solicitante__username",
    )
    ordering = ("reserva__inicio", "equipamento__codigo")
    list_select_related = (
        "reserva",
        "equipamento",
        "reserva__ambiente",
        "reserva__solicitante",
    )
    list_per_page = 25


@admin.register(BloqueioAmbiente)
class BloqueioAmbienteAdmin(admin.ModelAdmin):
    list_display = ("ambiente", "inicio", "fim", "motivo", "criado_por")
    list_filter = (
        ("ambiente", admin.RelatedOnlyFieldListFilter),
        ("criado_por", admin.RelatedOnlyFieldListFilter),
        ("inicio", admin.DateFieldListFilter),
    )
    search_fields = (
        "ambiente__codigo",
        "ambiente__nome",
        "motivo",
        "criado_por__username",
        "criado_por__first_name",
        "criado_por__last_name",
    )
    ordering = ("inicio",)
    date_hierarchy = "inicio"
    list_select_related = ("ambiente", "criado_por")
    list_per_page = 25
