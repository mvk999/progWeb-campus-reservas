"""Serializers da API de reservas."""

from datetime import datetime

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from ambientes.models import Ambiente, Equipamento

from .models import BloqueioAmbiente, Reserva, ReservaEquipamento


def nome_do_usuario(usuario):
    return usuario.get_full_name() or usuario.username


class ReservaSerializer(serializers.ModelSerializer):
    """Reserva no formato devolvido pela API (somente leitura)."""

    environmentCode = serializers.CharField(source="ambiente.codigo")
    environmentName = serializers.CharField(source="ambiente.nome")
    date = serializers.SerializerMethodField()
    startTime = serializers.SerializerMethodField()
    endTime = serializers.SerializerMethodField()
    statusLabel = serializers.CharField(source="get_status_display")
    purpose = serializers.CharField(source="finalidade")
    participants = serializers.IntegerField(source="participantes")
    observations = serializers.CharField(source="observacoes")
    equipments = serializers.SerializerMethodField()
    requester = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="criado_em")
    evaluatedBy = serializers.SerializerMethodField()
    evaluatedAt = serializers.DateTimeField(source="avaliado_em")
    justification = serializers.CharField(source="justificativa")
    canCancel = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = (
            "id",
            "environmentCode",
            "environmentName",
            "date",
            "startTime",
            "endTime",
            "status",
            "statusLabel",
            "purpose",
            "participants",
            "observations",
            "equipments",
            "requester",
            "createdAt",
            "evaluatedBy",
            "evaluatedAt",
            "justification",
            "canCancel",
        )
        read_only_fields = fields

    def get_date(self, reserva):
        return timezone.localtime(reserva.inicio).date().isoformat()

    def get_startTime(self, reserva):
        return timezone.localtime(reserva.inicio).strftime("%H:%M")

    def get_endTime(self, reserva):
        return timezone.localtime(reserva.fim).strftime("%H:%M")

    def get_equipments(self, reserva):
        return [
            {
                "code": item.equipamento.codigo,
                "name": item.equipamento.nome,
                "quantity": item.quantidade,
            }
            for item in reserva.itens_equipamento.all()
        ]

    def get_requester(self, reserva):
        return {
            "username": reserva.solicitante.username,
            "name": nome_do_usuario(reserva.solicitante),
        }

    def get_evaluatedBy(self, reserva):
        if reserva.avaliado_por is None:
            return None
        return nome_do_usuario(reserva.avaliado_por)

    def get_canCancel(self, reserva):
        usuario = self.context["request"].user
        return reserva.pode_ser_cancelada_por(usuario)


class ReservaGestaoSerializer(ReservaSerializer):
    """Reserva vista pela gestão: indica se o pedido conflita com a agenda."""

    hasConflict = serializers.SerializerMethodField()

    class Meta(ReservaSerializer.Meta):
        fields = ReservaSerializer.Meta.fields + ("hasConflict",)
        read_only_fields = fields

    def get_hasConflict(self, reserva):
        """Pendente sobreposta a reserva aprovada ou bloqueio do ambiente.

        Avisa o responsável de que a aprovação vai ser recusada.
        """
        if reserva.status != Reserva.Status.PENDENTE:
            return False
        sobrepostos = {
            "ambiente_id": reserva.ambiente_id,
            "inicio__lt": reserva.fim,
            "fim__gt": reserva.inicio,
        }
        return (
            Reserva.objects.filter(status=Reserva.Status.APROVADA, **sobrepostos)
            .exclude(pk=reserva.pk)
            .exists()
            or BloqueioAmbiente.objects.filter(**sobrepostos).exists()
        )


class ItemEquipamentoSerializer(serializers.Serializer):
    code = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1)


# Campo do modelo -> campo da API, para devolver os erros dos clean() com os
# nomes que o frontend conhece.
CAMPOS_DA_API = {
    "ambiente": "environmentCode",
    "inicio": "startTime",
    "fim": "endTime",
    "finalidade": "purpose",
    "participantes": "participants",
    "observacoes": "observations",
}


def erros_para_api(erro):
    if not hasattr(erro, "error_dict"):
        return {"non_field_errors": erro.messages}
    erros = {}
    for campo, mensagens in erro.message_dict.items():
        chave = CAMPOS_DA_API.get(campo, "non_field_errors")
        erros.setdefault(chave, []).extend(mensagens)
    return erros


class ReservaCriacaoSerializer(serializers.Serializer):
    environmentCode = serializers.CharField()
    date = serializers.DateField()
    startTime = serializers.TimeField(format="%H:%M")
    endTime = serializers.TimeField(format="%H:%M")
    purpose = serializers.CharField(max_length=200)
    participants = serializers.IntegerField(min_value=1)
    observations = serializers.CharField(required=False, allow_blank=True, default="")
    equipments = ItemEquipamentoSerializer(many=True, required=False, default=list)

    def validate_environmentCode(self, codigo):
        try:
            return Ambiente.objects.get(codigo=codigo, ativo=True)
        except Ambiente.DoesNotExist:
            raise serializers.ValidationError("Ambiente não encontrado ou inativo.")

    def validate_equipments(self, itens):
        codigos = [item["code"] for item in itens]
        if len(codigos) != len(set(codigos)):
            raise serializers.ValidationError(
                "Cada equipamento só pode aparecer uma vez."
            )
        equipamentos = Equipamento.objects.in_bulk(codigos, field_name="codigo")
        desconhecidos = sorted(set(codigos) - set(equipamentos))
        if desconhecidos:
            raise serializers.ValidationError(
                f"Equipamento não encontrado: {', '.join(desconhecidos)}."
            )
        return [
            (equipamentos[item["code"]], item["quantity"]) for item in itens
        ]

    def validate(self, dados):
        inicio = timezone.make_aware(datetime.combine(dados["date"], dados["startTime"]))
        fim = timezone.make_aware(datetime.combine(dados["date"], dados["endTime"]))
        if fim <= inicio:
            raise serializers.ValidationError(
                {"endTime": "O horário final deve ser posterior ao inicial."}
            )
        if inicio <= timezone.now():
            raise serializers.ValidationError(
                {"startTime": "Só é possível reservar horários futuros."}
            )
        ambiente = dados["environmentCode"]
        self._validar_horario_livre(ambiente, inicio, fim)
        dados["inicio"], dados["fim"] = inicio, fim
        return dados

    def _validar_horario_livre(self, ambiente, inicio, fim):
        """Recusa pedidos sobre reservas aprovadas ou bloqueios do ambiente,
        e pedidos repetidos do mesmo solicitante.

        O modelo só verifica conflitos na aprovação; recusar aqui evita um
        pedido que seria rejeitado com certeza.
        """
        sobrepostos = {"inicio__lt": fim, "fim__gt": inicio, "ambiente": ambiente}
        if Reserva.objects.filter(status=Reserva.Status.APROVADA, **sobrepostos).exists():
            raise serializers.ValidationError(
                {"startTime": "O ambiente já possui reserva aprovada neste horário."}
            )
        if BloqueioAmbiente.objects.filter(**sobrepostos).exists():
            raise serializers.ValidationError(
                {"startTime": "O ambiente está bloqueado neste horário."}
            )
        # Pedidos de pessoas diferentes para o mesmo horário são permitidos (o
        # responsável escolhe qual aprovar), mas a mesma pessoa repetir o
        # pedido no mesmo ambiente só gera uma solicitação duplicada.
        if Reserva.objects.filter(
            solicitante=self.context["request"].user,
            status__in=(Reserva.Status.PENDENTE, Reserva.Status.APROVADA),
            **sobrepostos,
        ).exists():
            raise serializers.ValidationError(
                {
                    "startTime": (
                        "Você já tem uma solicitação para este ambiente "
                        "neste horário."
                    )
                }
            )

    @transaction.atomic
    def create(self, dados):
        reserva = Reserva(
            solicitante=self.context["request"].user,
            ambiente=dados["environmentCode"],
            inicio=dados["inicio"],
            fim=dados["fim"],
            finalidade=dados["purpose"],
            participantes=dados["participants"],
            observacoes=dados["observations"],
            status=Reserva.Status.PENDENTE,
        )
        # full_clean() roda os clean() do modelo: as mesmas regras do Admin.
        try:
            reserva.full_clean()
        except DjangoValidationError as erro:
            raise serializers.ValidationError(erros_para_api(erro))
        reserva.save()

        for equipamento, quantidade in dados["equipments"]:
            item = ReservaEquipamento(
                reserva=reserva, equipamento=equipamento, quantidade=quantidade
            )
            try:
                item.full_clean()
            except DjangoValidationError as erro:
                # O erro desfaz a transação inteira, inclusive a reserva.
                raise serializers.ValidationError(
                    {
                        "equipments": [
                            f"{equipamento.codigo}: {mensagem}"
                            for mensagem in erro.messages
                        ]
                    }
                )
            item.save()
        return reserva
