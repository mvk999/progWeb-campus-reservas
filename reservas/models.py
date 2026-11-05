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
        self._validar_reserva_concluida()
        self._validar_ambiente_e_solicitante_ativos()
        self._validar_dados_de_avaliacao()
        self._validar_conflito_com_aprovadas()
        self._validar_conflito_com_bloqueios()

    # Campos que definem o registro histórico de uma reserva concluída.
    CAMPOS_HISTORICOS = {
        "status": "status",
        "inicio": "inicio",
        "fim": "fim",
        "ambiente_id": "ambiente",
        "solicitante_id": "solicitante",
    }

    def _validar_reserva_concluida(self):
        """Preserva reservas CONCLUIDAS como registro histórico.

        - Só é possível concluir uma reserva cujo período já terminou.
        - Depois de salva como CONCLUIDA, a reserva não pode ter status,
          horário, ambiente ou solicitante alterados (observações continuam
          editáveis).
        """
        erros = {}
        if (
            self.status == ReservaStatus.CONCLUIDA
            and self.fim is not None
            and self.fim > timezone.now()
        ):
            erros["status"] = (
                "Só é possível concluir uma reserva cujo período já terminou."
            )

        if self.pk is not None:
            anterior = (
                type(self)
                .objects.filter(pk=self.pk)
                .values(*self.CAMPOS_HISTORICOS)
                .first()
            )
            if anterior and anterior["status"] == ReservaStatus.CONCLUIDA:
                for atributo, campo in self.CAMPOS_HISTORICOS.items():
                    if getattr(self, atributo) != anterior[atributo]:
                        erros[campo] = (
                            "Reserva concluída é registro histórico; este campo "
                            "não pode ser alterado."
                        )
        if erros:
            raise ValidationError(erros)

    def _validar_dados_de_avaliacao(self):
        """Mantém coerentes o status e os campos de avaliação.

        - APROVADA e REJEITADA exigem quem avaliou e quando.
        - REJEITADA exige justificativa.
        - PENDENTE ainda não foi avaliada: não pode ter avaliador nem data.
        - O solicitante não pode avaliar a própria reserva.
        CANCELADA e CONCLUIDA não exigem avaliação (o cancelamento pode
        partir do próprio solicitante).
        """
        erros = {}
        avaliadas = (ReservaStatus.APROVADA, ReservaStatus.REJEITADA)
        if self.status in avaliadas:
            if self.avaliado_por_id is None:
                erros["avaliado_por"] = (
                    "Informe quem avaliou a reserva aprovada ou rejeitada."
                )
            if self.avaliado_em is None:
                erros["avaliado_em"] = (
                    "Informe a data da avaliação da reserva aprovada ou rejeitada."
                )
        if self.status == ReservaStatus.REJEITADA and not self.justificativa.strip():
            erros["justificativa"] = "Informe a justificativa da rejeição."
        if self.status == ReservaStatus.PENDENTE:
            if self.avaliado_por_id is not None:
                erros["avaliado_por"] = (
                    "Reserva pendente ainda não foi avaliada; deixe o avaliador vazio."
                )
            if self.avaliado_em is not None:
                erros["avaliado_em"] = (
                    "Reserva pendente ainda não foi avaliada; deixe a data vazia."
                )
        if (
            self.avaliado_por_id is not None
            and self.avaliado_por_id == self.solicitante_id
            and "avaliado_por" not in erros
        ):
            erros["avaliado_por"] = (
                "O solicitante não pode avaliar a própria reserva."
            )
        if erros:
            raise ValidationError(erros)

    def _validar_ambiente_e_solicitante_ativos(self):
        """Impede reservar ambiente inativo ou em nome de usuário inativo.

        A regra vale para reservas novas e quando o ambiente ou o solicitante
        é trocado. Reservas antigas continuam editáveis mesmo que o ambiente
        ou o usuário tenha sido desativado depois.
        """
        anterior = None
        if self.pk is not None:
            anterior = (
                type(self)
                .objects.filter(pk=self.pk)
                .values("ambiente_id", "solicitante_id")
                .first()
            )

        def mudou(campo):
            return anterior is None or anterior[campo] != getattr(self, campo)

        erros = {}
        if (
            self.ambiente_id is not None
            and mudou("ambiente_id")
            and not self.ambiente.ativo
        ):
            erros["ambiente"] = "Este ambiente está inativo e não pode ser reservado."
        if (
            self.solicitante_id is not None
            and mudou("solicitante_id")
            and not self.solicitante.is_active
        ):
            erros["solicitante"] = (
                "Este usuário está inativo e não pode solicitar reservas."
            )
        if erros:
            raise ValidationError(erros)

    def _validar_conflito_com_bloqueios(self):
        """Impede aprovar reserva durante um bloqueio do mesmo ambiente.

        Usa a mesma regra de sobreposição das reservas: um bloqueio que
        termina exatamente quando a reserva começa (ou vice-versa) não conflita.
        """
        if (
            self.status != ReservaStatus.APROVADA
            or self.ambiente_id is None
            or self.inicio is None
            or self.fim is None
        ):
            return

        bloqueio = (
            BloqueioAmbiente.objects.filter(
                ambiente_id=self.ambiente_id,
                inicio__lt=self.fim,
                fim__gt=self.inicio,
            )
            .order_by("inicio")
            .first()
        )
        if bloqueio is not None:
            inicio_local = timezone.localtime(bloqueio.inicio)
            fim_local = timezone.localtime(bloqueio.fim)
            raise ValidationError(
                {
                    "status": (
                        "Não é possível aprovar: o ambiente está bloqueado de "
                        f"{inicio_local:%d/%m/%Y %H:%M} a "
                        f"{fim_local:%d/%m/%Y %H:%M} ({bloqueio.motivo})."
                    )
                }
            )

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
        if self.equipamento_id is None:
            return
        self._validar_equipamento_ativo()
        self._validar_estoque()

    def _validar_equipamento_ativo(self):
        """Equipamento inativo não pode ser adicionado nem trocado em um item.

        Itens já existentes continuam editáveis mesmo que o equipamento seja
        desativado depois, para não travar reservas antigas.
        """
        if self.equipamento.ativo:
            return
        if self.pk is not None:
            anterior = (
                type(self)
                .objects.filter(pk=self.pk)
                .values_list("equipamento_id", flat=True)
                .first()
            )
            if anterior == self.equipamento_id:
                return
        raise ValidationError(
            {"equipamento": "Este equipamento está inativo e não pode ser reservado."}
        )

    def _validar_estoque(self):
        """Impede pedir mais unidades do que o estoque permite.

        A quantidade nunca pode exceder ``quantidade_total``. Se a reserva
        estiver APROVADA, também soma as quantidades do mesmo equipamento em
        outras reservas APROVADAS com horário sobreposto
        (``inicio_existente < fim`` e ``fim_existente > inicio``).
        """
        if self.quantidade is None:
            return
        total = self.equipamento.quantidade_total
        if self.quantidade > total:
            raise ValidationError(
                {
                    "quantidade": (
                        f"Quantidade acima do estoque: o equipamento possui "
                        f"{total} unidade(s)."
                    )
                }
            )

        try:
            reserva = self.reserva
        except Reserva.DoesNotExist:
            return
        if (
            reserva.status != ReservaStatus.APROVADA
            or reserva.inicio is None
            or reserva.fim is None
        ):
            return

        em_uso = (
            type(self)
            .objects.filter(
                equipamento_id=self.equipamento_id,
                reserva__status=ReservaStatus.APROVADA,
                reserva__inicio__lt=reserva.fim,
                reserva__fim__gt=reserva.inicio,
            )
            .exclude(reserva_id=reserva.pk)
            .aggregate(total=models.Sum("quantidade"))["total"]
            or 0
        )
        disponivel = total - em_uso
        if self.quantidade > disponivel:
            raise ValidationError(
                {
                    "quantidade": (
                        f"Estoque insuficiente no horário: {em_uso} de {total} "
                        f"unidade(s) já estão em reservas aprovadas; restam "
                        f"{max(disponivel, 0)}."
                    )
                }
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
