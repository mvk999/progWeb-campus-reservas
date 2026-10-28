"""Modelo de reservas de ambientes universitários."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class ReservaStatus(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    APROVADA = "APROVADA", "Aprovada"
    REJEITADA = "REJEITADA", "Rejeitada"
    CANCELADA = "CANCELADA", "Cancelada"
    CONCLUIDA = "CONCLUIDA", "Concluída"


class Reserva(models.Model):
    Status = ReservaStatus

    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reservas_solicitadas",
    )
    ambiente = models.ForeignKey(
        "ambientes.Ambiente",
        on_delete=models.PROTECT,
        related_name="reservas",
    )
    inicio = models.DateTimeField()
    fim = models.DateTimeField()
    status = models.CharField(
        max_length=9,
        choices=ReservaStatus.choices,
        default=ReservaStatus.PENDENTE,
    )
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    avaliado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reservas_avaliadas",
        null=True,
        blank=True,
    )
    avaliado_em = models.DateTimeField(null=True, blank=True)
    justificativa = models.TextField(blank=True)

    class Meta:
        verbose_name = "reserva"
        verbose_name_plural = "reservas"
        ordering = ("inicio",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(inicio__lt=models.F("fim")),
                name="reserva_inicio_menor_que_fim",
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=ReservaStatus.values),
                name="reserva_status_valido",
            ),
        ]

    def clean(self):
        super().clean()
        if self.inicio is not None and self.fim is not None and self.inicio >= self.fim:
            raise ValidationError(
                {"fim": "O fim da reserva deve ser posterior ao início."}
            )

    def __str__(self):
        return f"{self.solicitante} — {self.ambiente} — {self.inicio:%d/%m/%Y %H:%M}"
