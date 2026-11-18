"""Serializers da API de ambientes e equipamentos."""

from rest_framework import serializers

from .models import Ambiente, CategoriaAmbiente, Equipamento


class AmbienteSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source="codigo")
    name = serializers.CharField(source="nome")
    category = serializers.CharField(source="categoria.nome")
    location = serializers.CharField(source="localizacao")
    buildingCode = serializers.CharField(source="predio")
    capacity = serializers.IntegerField(source="capacidade")
    responsible = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()

    class Meta:
        model = Ambiente
        fields = (
            "code",
            "name",
            "category",
            "location",
            "buildingCode",
            "capacity",
            "responsible",
            "features",
        )
        read_only_fields = fields

    def get_responsible(self, ambiente):
        return ambiente.responsavel.get_full_name() or ambiente.responsavel.username

    def get_features(self, ambiente):
        # Os equipamentos são um estoque compartilhado e não pertencem a uma
        # sala; a lista existe para manter o formato esperado pelo frontend.
        return []


class AmbienteDetalheSerializer(AmbienteSerializer):
    description = serializers.CharField(source="descricao")

    class Meta(AmbienteSerializer.Meta):
        fields = AmbienteSerializer.Meta.fields + ("description",)
        read_only_fields = fields


class AmbienteFiltroSerializer(serializers.Serializer):
    """Valida os filtros opcionais da listagem (query string)."""

    category = serializers.CharField(required=False)
    building = serializers.CharField(required=False)
    minimumCapacity = serializers.IntegerField(required=False, min_value=1)
    q = serializers.CharField(required=False)


class DisponibilidadeFiltroSerializer(serializers.Serializer):
    date = serializers.DateField()


class CategoriaAmbienteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="nome")

    class Meta:
        model = CategoriaAmbiente
        fields = ("name",)
        read_only_fields = fields


class EquipamentoSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source="codigo")
    name = serializers.CharField(source="nome")
    category = serializers.CharField(source="categoria.nome")
    totalQuantity = serializers.IntegerField(source="quantidade_total")

    class Meta:
        model = Equipamento
        fields = ("code", "name", "category", "totalQuantity")
        read_only_fields = fields
