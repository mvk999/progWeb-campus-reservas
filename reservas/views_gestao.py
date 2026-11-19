"""Views da API de gestão de reservas (responsáveis e administradores)."""

from datetime import datetime, time, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.perfis import PERFIL_ADMINISTRADOR, perfil_do_usuario

from .models import BloqueioAmbiente, Reserva
from .permissions import EhGestor
from .serializers import ReservaGestaoSerializer, erros_para_api


def ambientes_geridos(usuario):
    """Filtro dos ambientes que o usuário pode gerir ({} = todos)."""
    if perfil_do_usuario(usuario) == PERFIL_ADMINISTRADOR:
        return {}
    return {"ambiente__responsavel": usuario}


def reservas_geridas(usuario):
    """Toda consulta da gestão parte daqui: o responsável só vê os próprios
    ambientes; o administrador vê todos."""
    return (
        Reserva.objects.filter(**ambientes_geridos(usuario))
        .select_related("ambiente", "solicitante", "avaliado_por")
        .prefetch_related("itens_equipamento__equipamento")
    )


class GestaoView(APIView):
    permission_classes = [IsAuthenticated, EhGestor]


class FiltroGestaoSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Reserva.Status.values, required=False)
    environment = serializers.CharField(required=False)
    date = serializers.DateField(required=False)


class GestaoReservasView(GestaoView):
    def get(self, request):
        filtro = FiltroGestaoSerializer(data=request.query_params)
        filtro.is_valid(raise_exception=True)
        dados = filtro.validated_data

        reservas = reservas_geridas(request.user).order_by("inicio")
        if "status" in dados:
            reservas = reservas.filter(status=dados["status"])
        if "environment" in dados:
            reservas = reservas.filter(ambiente__codigo__iexact=dados["environment"])
        if "date" in dados:
            inicio, fim = limites_dos_dias(dados["date"], dados["date"])
            reservas = reservas.filter(inicio__lt=fim, fim__gt=inicio)

        serializer = ReservaGestaoSerializer(
            reservas, many=True, context={"request": request}
        )
        return Response(serializer.data)


class AvaliacaoView(GestaoView):
    """Base de aprovar e rejeitar: as duas só valem para reservas pendentes."""

    novo_status = None

    def post(self, request, pk):
        with transaction.atomic():
            # O transaction_mode "IMMEDIATE" do SQLite trava o banco no início
            # do atomic(): duas aprovações simultâneas rodam uma de cada vez,
            # e a segunda já enxerga a primeira ao validar conflitos.
            reserva = get_object_or_404(reservas_geridas(request.user), pk=pk)
            if reserva.status != Reserva.Status.PENDENTE:
                return erro("Só é possível avaliar reservas pendentes.")

            erro_extra = self.validar(request, reserva)
            if erro_extra is not None:
                return erro_extra

            reserva.status = self.novo_status
            reserva.avaliado_por = request.user
            reserva.avaliado_em = timezone.now()
            try:
                reserva.full_clean()
            except DjangoValidationError as falha:
                return Response(
                    erros_para_api(falha), status=status.HTTP_400_BAD_REQUEST
                )
            erros_dos_itens = self.erros_dos_itens(reserva)
            if erros_dos_itens:
                return Response(
                    {"equipments": erros_dos_itens}, status=status.HTTP_400_BAD_REQUEST
                )
            reserva.save()

        reserva = reservas_geridas(request.user).get(pk=pk)
        return Response(
            ReservaGestaoSerializer(reserva, context={"request": request}).data
        )

    def validar(self, request, reserva):
        """Regras próprias de cada ação; devolve uma resposta de erro ou None."""
        return None

    def erros_dos_itens(self, reserva):
        return []


def erro(mensagem):
    return Response(
        {"non_field_errors": [mensagem]}, status=status.HTTP_400_BAD_REQUEST
    )


class AprovarReservaView(AvaliacaoView):
    novo_status = Reserva.Status.APROVADA

    def validar(self, request, reserva):
        if reserva.inicio <= timezone.now():
            return erro("Não é possível aprovar uma reserva que já começou.")
        return None

    def erros_dos_itens(self, reserva):
        """Confere o estoque de cada equipamento com a reserva já aprovada.

        A regra de estoque por horário fica no clean() de ReservaEquipamento
        e só considera reservas APROVADAS, então os itens precisam ser
        validados de novo com o status novo.
        """
        mensagens = []
        for item in reserva.itens_equipamento.all():
            item.reserva = reserva
            try:
                item.full_clean()
            except DjangoValidationError as falha:
                mensagens += [f"{item.equipamento.codigo}: {m}" for m in falha.messages]
        return mensagens


class JustificativaSerializer(serializers.Serializer):
    justification = serializers.CharField()


class RejeitarReservaView(AvaliacaoView):
    novo_status = Reserva.Status.REJEITADA

    def validar(self, request, reserva):
        dados = JustificativaSerializer(data=request.data)
        if not dados.is_valid():
            return Response(dados.errors, status=status.HTTP_400_BAD_REQUEST)
        reserva.justificativa = dados.validated_data["justification"]
        return None


class FiltroOcupacaoSerializer(serializers.Serializer):
    LIMITE_DE_DIAS = 62

    start = serializers.DateField()
    end = serializers.DateField()

    def validate(self, dados):
        if dados["end"] < dados["start"]:
            raise serializers.ValidationError(
                {"end": "A data final deve ser igual ou posterior à inicial."}
            )
        if (dados["end"] - dados["start"]).days >= self.LIMITE_DE_DIAS:
            raise serializers.ValidationError(
                {"end": f"Consulte no máximo {self.LIMITE_DE_DIAS} dias por vez."}
            )
        return dados


def limites_dos_dias(primeiro, ultimo):
    """Início do primeiro dia e início do dia seguinte ao último (fuso local)."""
    inicio = timezone.make_aware(datetime.combine(primeiro, time.min))
    fim = timezone.make_aware(datetime.combine(ultimo + timedelta(days=1), time.min))
    return inicio, fim


def recortar_por_dia(inicio, fim, primeiro_dia, ultimo_dia):
    """Divide um intervalo em pedaços de um dia, dentro do período pedido.

    Um bloqueio de sexta 20h a sábado 6h vira dois itens: sexta 20:00–24:00
    e sábado 00:00–06:00.
    """
    inicio, fim = timezone.localtime(inicio), timezone.localtime(fim)
    dia = max(inicio.date(), primeiro_dia)
    while dia <= ultimo_dia:
        comeco_do_dia, fim_do_dia = limites_dos_dias(dia, dia)
        if inicio >= fim_do_dia:
            dia += timedelta(days=1)
            continue
        if fim <= comeco_do_dia:
            break
        pedaco_inicio = max(inicio, comeco_do_dia)
        pedaco_fim = min(fim, fim_do_dia)
        hora_fim = (
            "24:00"
            if pedaco_fim == fim_do_dia
            else timezone.localtime(pedaco_fim).strftime("%H:%M")
        )
        yield dia, timezone.localtime(pedaco_inicio).strftime("%H:%M"), hora_fim
        dia += timedelta(days=1)


class OcupacaoView(GestaoView):
    """Reservas pendentes e aprovadas e bloqueios, dia a dia, no período."""

    def get(self, request):
        filtro = FiltroOcupacaoSerializer(data=request.query_params)
        filtro.is_valid(raise_exception=True)
        primeiro, ultimo = filtro.validated_data["start"], filtro.validated_data["end"]
        inicio, fim = limites_dos_dias(primeiro, ultimo)
        escopo = ambientes_geridos(request.user)

        reservas = Reserva.objects.filter(
            status__in=(Reserva.Status.APROVADA, Reserva.Status.PENDENTE),
            inicio__lt=fim,
            fim__gt=inicio,
            **escopo,
        ).select_related("ambiente")
        bloqueios = BloqueioAmbiente.objects.filter(
            inicio__lt=fim, fim__gt=inicio, **escopo
        ).select_related("ambiente")

        itens = []
        for origem, registros in (("reserva", reservas), ("bloqueio", bloqueios)):
            for registro in registros:
                extra = (
                    {"type": registro.status}
                    if origem == "reserva"
                    else {"type": "BLOQUEIO", "reason": registro.motivo}
                )
                for dia, hora_inicio, hora_fim in recortar_por_dia(
                    registro.inicio, registro.fim, primeiro, ultimo
                ):
                    itens.append(
                        {
                            "id": f"{origem}-{registro.pk}",
                            "date": dia.isoformat(),
                            "startTime": hora_inicio,
                            "endTime": hora_fim,
                            **extra,
                            "environmentCode": registro.ambiente.codigo,
                            "environmentName": registro.ambiente.nome,
                            "buildingCode": registro.ambiente.predio,
                        }
                    )
        itens.sort(key=lambda i: (i["date"], i["startTime"], i["environmentCode"]))
        return Response(
            {"start": primeiro.isoformat(), "end": ultimo.isoformat(), "items": itens}
        )
