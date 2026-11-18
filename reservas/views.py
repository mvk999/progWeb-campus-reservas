"""Views da API de reservas do usuário logado."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Reserva
from .serializers import ReservaCriacaoSerializer, ReservaSerializer, erros_para_api


def reservas_do_usuario(usuario):
    """Toda consulta parte daqui: ninguém enxerga reservas de outra pessoa."""
    return (
        Reserva.objects.filter(solicitante=usuario)
        .select_related("ambiente", "solicitante", "avaliado_por")
        .prefetch_related("itens_equipamento__equipamento")
    )


class EscopoSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(
        choices=("upcoming", "history"), required=False, default="upcoming"
    )


class MinhasReservasView(APIView):
    def get(self, request):
        filtro = EscopoSerializer(data=request.query_params)
        filtro.is_valid(raise_exception=True)
        agora = timezone.now()
        reservas = reservas_do_usuario(request.user)
        if filtro.validated_data["scope"] == "upcoming":
            reservas = reservas.filter(fim__gt=agora).order_by("inicio")
        else:
            reservas = reservas.filter(fim__lte=agora).order_by("-inicio")
        serializer = ReservaSerializer(reservas, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        criacao = ReservaCriacaoSerializer(data=request.data, context={"request": request})
        criacao.is_valid(raise_exception=True)
        reserva = criacao.save()
        reserva = reservas_do_usuario(request.user).get(pk=reserva.pk)
        serializer = ReservaSerializer(reserva, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReservaDetalheView(APIView):
    def get(self, request, pk):
        reserva = get_object_or_404(reservas_do_usuario(request.user), pk=pk)
        return Response(ReservaSerializer(reserva, context={"request": request}).data)


class CancelarReservaView(APIView):
    def post(self, request, pk):
        with transaction.atomic():
            # select_for_update trava a linha até o fim da transação, para
            # que um cancelamento e uma aprovação simultâneos não se misturem.
            reserva = get_object_or_404(
                Reserva.objects.select_for_update(),
                pk=pk,
                solicitante=request.user,
            )
            if not reserva.pode_ser_cancelada_por(request.user):
                return Response(
                    {
                        "non_field_errors": [
                            "Só é possível cancelar reservas pendentes ou "
                            "aprovadas que ainda não começaram."
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            reserva.status = Reserva.Status.CANCELADA
            try:
                reserva.full_clean()
            except DjangoValidationError as erro:
                return Response(erros_para_api(erro), status=status.HTTP_400_BAD_REQUEST)
            reserva.save()

        reserva = reservas_do_usuario(request.user).get(pk=pk)
        return Response(ReservaSerializer(reserva, context={"request": request}).data)
