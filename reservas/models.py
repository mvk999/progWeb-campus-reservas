"""Modelo de reservas de ambientes universitários."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.deletion import ProtectedError
from django.utils import timezone


class ReservaStatus(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    APROVADA = "APROVADA", "Aprovada"
    REJEITADA = "REJEITADA", "Rejeitada"
    CANCELADA = "CANCELADA", "Cancelada"
    CONCLUIDA = "CONCLUIDA", "Concluída"


RESERVA_CONCLUIDA_DELETE_ERROR = (
    "Reservas concluídas são registros históricos e não podem ser excluídas."
)


class ReservaQuerySet(models.QuerySet):
    def delete(self):
        concluidas = list(
            self.filter(status=ReservaStatus.CONCLUIDA)
            .select_related(None)
            .only("pk", "status")
        )
        if concluidas:
            raise ProtectedError(RESERVA_CONCLUIDA_DELETE_ERROR, concluidas)
        return super().delete()


class Reserva(models.Model):
    Status = ReservaStatus
    objects = ReservaQuerySet.as_manager()

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
    equipamentos = models.ManyToManyField(
        "ambientes.Equipamento",
        through="ReservaEquipamento",
        related_name="reservas",
        blank=True,
    )

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
        self._validar_conflito_com_aprovadas()

    def _validar_conflito_com_aprovadas(self):
        """Impede duas reservas APROVADAS sobrepostas no mesmo ambiente.

        Dois intervalos se sobrepõem quando
        ``inicio_existente < fim_novo`` e ``fim_existente > inicio_novo``.
        Horários consecutivos (ex.: 14h–16h e 16h–18h) não conflitam.
        Reservas em outros status não ocupam o ambiente.
        """
        if (
            self.status != ReservaStatus.APROVADA
            or self.ambiente_id is None
            or self.inicio is None
            or self.fim is None
        ):
            return

        conflitos = (
            type(self)
            .objects.filter(
                ambiente_id=self.ambiente_id,
                status=ReservaStatus.APROVADA,
                inicio__lt=self.fim,
                fim__gt=self.inicio,
            )
            .exclude(pk=self.pk)
            .order_by("inicio")
        )
        conflito = conflitos.first()
        if conflito is not None:
            inicio_local = timezone.localtime(conflito.inicio)
            fim_local = timezone.localtime(conflito.fim)
            raise ValidationError(
                {
                    "status": (
                        "Não é possível aprovar: o ambiente já possui reserva "
                        f"aprovada de {inicio_local:%d/%m/%Y %H:%M} a "
                        f"{fim_local:%d/%m/%Y %H:%M}."
                    )
                }
            )

    def delete(self, using=None, keep_parents=False):
        if self.pk:
            concluida = type(self).objects.filter(
                pk=self.pk,
                status=ReservaStatus.CONCLUIDA,
            ).first()
            if concluida is not None:
                raise ProtectedError(
                    RESERVA_CONCLUIDA_DELETE_ERROR,
                    [concluida],
                )
        return super().delete(using=using, keep_parents=keep_parents)

    def __str__(self):
        inicio_local = timezone.localtime(self.inicio)
        return f"{self.solicitante} — {self.ambiente} — {inicio_local:%d/%m/%Y %H:%M}"


class ReservaEquipamento(models.Model):
    reserva = models.ForeignKey(
        Reserva,
        on_delete=models.PROTECT,
        related_name="itens_equipamento",
    )
    equipamento = models.ForeignKey(
        "ambientes.Equipamento",
        on_delete=models.PROTECT,
        related_name="itens_reserva",
    )
    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        verbose_name = "equipamento da reserva"
        verbose_name_plural = "equipamentos da reserva"
        ordering = ("reserva", "equipamento")
        constraints = [
            models.UniqueConstraint(
                fields=("reserva", "equipamento"),
                name="reserva_equipamento_unico",
            ),
            models.CheckConstraint(
                condition=models.Q(quantidade__gte=1),
                name="reserva_equip_quantidade_gte_1",
            ),
        ]

    def clean(self):
        super().clean()
        if self.quantidade is not None and self.quantidade < 1:
            raise ValidationError(
                {"quantidade": "A quantidade solicitada deve ser pelo menos 1."}
            )

    def __str__(self):
        return f"{self.quantidade} × {self.equipamento} — {self.reserva}"


class BloqueioAmbiente(models.Model):
    ambiente = models.ForeignKey(
        "ambientes.Ambiente",
        on_delete=models.PROTECT,
        related_name="bloqueios",
    )
    inicio = models.DateTimeField()
    fim = models.DateTimeField()
    motivo = models.TextField()
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="bloqueios_criados",
    )

    class Meta:
        verbose_name = "bloqueio de ambiente"
        verbose_name_plural = "bloqueios de ambientes"
        ordering = ("inicio",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(inicio__lt=models.F("fim")),
                name="bloqueio_inicio_menor_que_fim",
            ),
        ]

    def clean(self):
        super().clean()
        if self.inicio is not None and self.fim is not None and self.inicio >= self.fim:
            raise ValidationError(
                {"fim": "O fim do bloqueio deve ser posterior ao início."}
            )

    def __str__(self):
        inicio_local = timezone.localtime(self.inicio)
        fim_local = timezone.localtime(self.fim)
        return (
            f"{self.ambiente} — {self.motivo} — "
            f"{inicio_local:%d/%m/%Y %H:%M} a {fim_local:%d/%m/%Y %H:%M}"
        )
