"""Models de categorias e ambientes universitários."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class CategoriaAmbiente(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(blank=True)

    class Meta:
        verbose_name = "categoria de ambiente"
        verbose_name_plural = "categorias de ambientes"
        ordering = ("nome",)

    def __str__(self):
        return self.nome


class Ambiente(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    localizacao = models.CharField(max_length=200)
    capacidade = models.PositiveIntegerField()
    ativo = models.BooleanField(default=True)
    categoria = models.ForeignKey(
        CategoriaAmbiente,
        on_delete=models.PROTECT,
        related_name="ambientes",
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ambientes_sob_responsabilidade",
    )

    class Meta:
        verbose_name = "ambiente"
        verbose_name_plural = "ambientes"
        ordering = ("codigo",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(capacidade__gte=1),
                name="ambiente_capacidade_gte_1",
            ),
        ]

    def clean(self):
        super().clean()
        if self.capacidade is not None and self.capacidade < 1:
            raise ValidationError(
                {"capacidade": "A capacidade deve ser de pelo menos 1."}
            )

    def __str__(self):
        return f"{self.codigo} - {self.nome}"


class CategoriaEquipamento(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(blank=True)

    class Meta:
        verbose_name = "categoria de equipamento"
        verbose_name_plural = "categorias de equipamentos"
        ordering = ("nome",)

    def __str__(self):
        return self.nome


class Equipamento(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    quantidade_total = models.PositiveIntegerField()
    ativo = models.BooleanField(default=True)
    categoria = models.ForeignKey(
        CategoriaEquipamento,
        on_delete=models.PROTECT,
        related_name="equipamentos",
    )

    class Meta:
        verbose_name = "equipamento"
        verbose_name_plural = "equipamentos"
        ordering = ("codigo",)

    def __str__(self):
        return f"{self.codigo} - {self.nome}"
