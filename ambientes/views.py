"""Views da API de ambientes e equipamentos (somente consulta)."""

from datetime import datetime, time, timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from reservas.models import BloqueioAmbiente, Reserva
from usuarios.perfis import PERFIL_ADMINISTRADOR, perfil_do_usuario

from .models import Ambiente, CategoriaAmbiente, Equipamento
from .serializers import (
    AmbienteDetalheSerializer,
    AmbienteFiltroSerializer,
    AmbienteSerializer,
    CategoriaAmbienteSerializer,
    DisponibilidadeFiltroSerializer,
    EquipamentoSerializer,
)


def ambientes_ativos():
    return Ambiente.objects.filter(ativo=True).select_related(
        "categoria", "responsavel"
    )


class AmbienteListView(generics.ListAPIView):
    serializer_class = AmbienteSerializer

    def get_queryset(self):
        filtros = AmbienteFiltroSerializer(data=self.request.query_params)
        filtros.is_valid(raise_exception=True)
        dados = filtros.validated_data

        ambientes = ambientes_ativos()
        # managed=true: só os ambientes que o usuário gere (o administrador
        # gere todos), a mesma regra usada na gestão de reservas.
        if dados.get("managed") and (
            perfil_do_usuario(self.request.user) != PERFIL_ADMINISTRADOR
        ):
            ambientes = ambientes.filter(responsavel=self.request.user)
        if "category" in dados:
            ambientes = ambientes.filter(categoria__nome__iexact=dados["category"])
        if "building" in dados:
            ambientes = ambientes.filter(predio__iexact=dados["building"])
        if "minimumCapacity" in dados:
            ambientes = ambientes.filter(capacidade__gte=dados["minimumCapacity"])
        if "q" in dados:
            termo = dados["q"]
            ambientes = ambientes.filter(
                Q(codigo__icontains=termo)
                | Q(nome__icontains=termo)
                | Q(localizacao__icontains=termo)
            )
        return ambientes


class AmbienteDetalheView(generics.RetrieveAPIView):
    serializer_class = AmbienteDetalheSerializer
    lookup_field = "codigo"
    lookup_url_kwarg = "code"

    def get_queryset(self):
        return ambientes_ativos()


class DisponibilidadeView(APIView):
    """Intervalos ocupados de um ambiente em um dia.

    Inclui reservas APROVADAS e PENDENTES e bloqueios que tocam o dia. Um
    intervalo que começa no dia anterior ou termina no seguinte é cortado
    nos limites do dia (``00:00`` e ``24:00``).
    """

    def get(self, request, code):
        ambiente = get_object_or_404(ambientes_ativos(), codigo=code)
        filtro = DisponibilidadeFiltroSerializer(data=request.query_params)
        filtro.is_valid(raise_exception=True)
        dia = filtro.validated_data["date"]

        inicio_do_dia = timezone.make_aware(datetime.combine(dia, time.min))
        fim_do_dia = inicio_do_dia + timedelta(days=1)

        reservas = Reserva.objects.filter(
            ambiente=ambiente,
            status__in=(Reserva.Status.APROVADA, Reserva.Status.PENDENTE),
            inicio__lt=fim_do_dia,
            fim__gt=inicio_do_dia,
        )
        bloqueios = BloqueioAmbiente.objects.filter(
            ambiente=ambiente,
            inicio__lt=fim_do_dia,
            fim__gt=inicio_do_dia,
        )

        def intervalo(inicio, fim):
            inicio = max(inicio, inicio_do_dia)
            fim = min(fim, fim_do_dia)
            return {
                "startTime": hora_local(inicio),
                "endTime": "24:00" if fim == fim_do_dia else hora_local(fim),
            }

        ocupados = [
            {**intervalo(r.inicio, r.fim), "type": r.status} for r in reservas
        ] + [
            {**intervalo(b.inicio, b.fim), "type": "BLOQUEIO", "reason": b.motivo}
            for b in bloqueios
        ]
        ocupados.sort(key=lambda item: (item["startTime"], item["endTime"]))

        return Response(
            {
                "environmentCode": ambiente.codigo,
                "date": dia.isoformat(),
                "occupied": ocupados,
            }
        )


def hora_local(momento):
    return timezone.localtime(momento).strftime("%H:%M")


class CategoriaAmbienteListView(generics.ListAPIView):
    serializer_class = CategoriaAmbienteSerializer
    queryset = CategoriaAmbiente.objects.order_by("nome")


class EquipamentoListView(generics.ListAPIView):
    serializer_class = EquipamentoSerializer
    queryset = Equipamento.objects.filter(ativo=True).select_related("categoria")
