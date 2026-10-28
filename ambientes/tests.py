"""Testes de persistência e integridade dos ambientes."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase

from .models import Ambiente, CategoriaAmbiente


User = get_user_model()


class AmbienteModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.responsavel = User.objects.create_user(username="responsavel-teste")
        cls.categoria = CategoriaAmbiente.objects.create(
            nome="Salas de estudo",
            descricao="Ambientes destinados ao estudo.",
        )

    def make_ambiente(self, **overrides):
        values = {
            "codigo": "BL-A101",
            "nome": "Sala de estudos A101",
            "descricao": "Sala para estudo individual.",
            "localizacao": "Bloco A",
            "capacidade": 30,
            "ativo": True,
            "categoria": self.categoria,
            "responsavel": self.responsavel,
        }
        values.update(overrides)
        return Ambiente(**values)

    def test_categoria_e_ambiente_persistem_com_relacionamentos_ao_usuario(self):
        ambiente = self.make_ambiente()
        ambiente.save()

        categoria_salva = CategoriaAmbiente.objects.get(pk=self.categoria.pk)
        ambiente_salvo = Ambiente.objects.select_related(
            "categoria", "responsavel"
        ).get(pk=ambiente.pk)

        self.assertEqual(categoria_salva.nome, "Salas de estudo")
        self.assertEqual(ambiente_salvo.categoria, self.categoria)
        self.assertEqual(ambiente_salvo.responsavel, self.responsavel)
        self.assertIn(ambiente_salvo, self.categoria.ambientes.all())
        self.assertIn(
            ambiente_salvo,
            self.responsavel.ambientes_sob_responsabilidade.all(),
        )

    def test_nome_da_categoria_unico_e_validado_em_python(self):
        duplicada = CategoriaAmbiente(nome=self.categoria.nome)

        with self.assertRaises(ValidationError) as error:
            duplicada.full_clean()

        self.assertIn("nome", error.exception.message_dict)

    def test_nome_da_categoria_unico_no_banco(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CategoriaAmbiente.objects.create(nome=self.categoria.nome)

        self.assertEqual(
            CategoriaAmbiente.objects.filter(nome=self.categoria.nome).count(), 1
        )

    def test_codigo_do_ambiente_unico_e_validado_em_python(self):
        existente = self.make_ambiente()
        existente.save()
        duplicado = self.make_ambiente(codigo=existente.codigo)

        with self.assertRaises(ValidationError) as error:
            duplicado.full_clean()

        self.assertIn("codigo", error.exception.message_dict)

    def test_codigo_do_ambiente_unico_no_banco(self):
        existente = self.make_ambiente()
        existente.save()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_ambiente(codigo=existente.codigo).save()

        self.assertEqual(
            Ambiente.objects.filter(codigo=existente.codigo).count(), 1
        )

    def test_capacidade_zero_rejeitada_por_full_clean(self):
        ambiente = self.make_ambiente(capacidade=0)

        with self.assertRaises(ValidationError) as error:
            ambiente.full_clean()

        self.assertIn("capacidade", error.exception.message_dict)

    def test_check_constraint_rejeita_capacidade_zero_sem_persistir(self):
        codigo = "CAP-ZERO"

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_ambiente(codigo=codigo, capacidade=0).save()

        self.assertFalse(Ambiente.objects.filter(codigo=codigo).exists())

    def test_categoria_referenciada_nao_pode_ser_excluida(self):
        ambiente = self.make_ambiente()
        ambiente.save()

        with self.assertRaises(ProtectedError):
            self.categoria.delete()

        self.assertTrue(CategoriaAmbiente.objects.filter(pk=self.categoria.pk).exists())

    def test_responsavel_referenciado_nao_pode_ser_excluido(self):
        ambiente = self.make_ambiente()
        ambiente.save()

        with self.assertRaises(ProtectedError):
            self.responsavel.delete()

        self.assertTrue(User.objects.filter(pk=self.responsavel.pk).exists())
