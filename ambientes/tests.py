"""Testes de persistência e integridade dos ambientes."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase

from .models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)


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


class EquipamentoModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.categoria = CategoriaEquipamento.objects.create(
            nome="Equipamentos audiovisuais",
            descricao="Recursos para apresentações.",
        )

    def make_equipamento(self, **overrides):
        values = {
            "codigo": "EQ-PROJ-01",
            "nome": "Projetor",
            "descricao": "Projetor multimídia.",
            "quantidade_total": 4,
            "categoria": self.categoria,
        }
        values.update(overrides)
        return Equipamento(**values)

    def test_categoria_e_equipamento_persistem_com_campos_e_strings(self):
        equipamento = self.make_equipamento()
        equipamento.save()

        categoria_salva = CategoriaEquipamento.objects.get(pk=self.categoria.pk)
        equipamento_salvo = Equipamento.objects.get(pk=equipamento.pk)

        self.assertEqual(categoria_salva.nome, "Equipamentos audiovisuais")
        self.assertEqual(str(categoria_salva), "Equipamentos audiovisuais")
        self.assertEqual(equipamento_salvo.codigo, "EQ-PROJ-01")
        self.assertEqual(equipamento_salvo.nome, "Projetor")
        self.assertEqual(equipamento_salvo.descricao, "Projetor multimídia.")
        self.assertEqual(equipamento_salvo.quantidade_total, 4)
        self.assertTrue(equipamento_salvo.ativo)
        self.assertEqual(equipamento_salvo.categoria, self.categoria)
        self.assertEqual(str(equipamento_salvo), "EQ-PROJ-01 - Projetor")

    def test_descricao_da_categoria_de_equipamento_e_opcional(self):
        categoria = CategoriaEquipamento.objects.create(nome="Recursos gerais")

        self.assertEqual(categoria.descricao, "")

    def test_nome_da_categoria_de_equipamento_unico_em_python(self):
        duplicada = CategoriaEquipamento(nome=self.categoria.nome)

        with self.assertRaises(ValidationError) as error:
            duplicada.full_clean()

        self.assertIn("nome", error.exception.message_dict)

    def test_nome_da_categoria_de_equipamento_unico_no_banco(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CategoriaEquipamento.objects.create(nome=self.categoria.nome)

        self.assertEqual(
            CategoriaEquipamento.objects.filter(nome=self.categoria.nome).count(), 1
        )

    def test_codigo_de_equipamento_unico_em_python(self):
        existente = self.make_equipamento()
        existente.save()
        duplicado = self.make_equipamento(codigo=existente.codigo)

        with self.assertRaises(ValidationError) as error:
            duplicado.full_clean()

        self.assertIn("codigo", error.exception.message_dict)

    def test_codigo_de_equipamento_unico_no_banco(self):
        existente = self.make_equipamento()
        existente.save()

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_equipamento(codigo=existente.codigo).save()

        self.assertEqual(
            Equipamento.objects.filter(codigo=existente.codigo).count(), 1
        )

    def test_quantidade_negativa_rejeitada_por_full_clean(self):
        equipamento = self.make_equipamento(quantidade_total=-1)

        with self.assertRaises(ValidationError) as error:
            equipamento.full_clean()

        self.assertIn("quantidade_total", error.exception.message_dict)

    def test_check_do_sqlite_rejeita_quantidade_negativa_sem_persistir(self):
        codigo = "EQ-NEGATIVO"

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_equipamento(
                    codigo=codigo,
                    quantidade_total=-1,
                ).save()

        self.assertFalse(Equipamento.objects.filter(codigo=codigo).exists())

    def test_quantidade_zero_e_aceita_e_relacao_reversa_funciona(self):
        equipamento = self.make_equipamento(
            codigo="EQ-SEM-ESTOQUE",
            quantidade_total=0,
        )
        equipamento.save()
        outro_equipamento = self.make_equipamento(
            codigo="EQ-CABO-01",
            nome="Cabo HDMI",
            quantidade_total=2,
        )
        outro_equipamento.save()

        equipamentos_salvos = list(self.categoria.equipamentos.order_by("codigo"))
        self.assertEqual(
            [item.pk for item in equipamentos_salvos],
            [outro_equipamento.pk, equipamento.pk],
        )
        equipamento_salvo = self.categoria.equipamentos.get(pk=equipamento.pk)
        self.assertEqual(equipamento_salvo.quantidade_total, 0)
        self.assertEqual(equipamento_salvo.categoria, self.categoria)

    def test_categoria_referenciada_nao_pode_ser_excluida(self):
        equipamento = self.make_equipamento()
        equipamento.save()

        with self.assertRaises(ProtectedError):
            self.categoria.delete()

        self.assertTrue(
            CategoriaEquipamento.objects.filter(pk=self.categoria.pk).exists()
        )
        self.assertTrue(Equipamento.objects.filter(pk=equipamento.pk).exists())

    def test_estado_ativo_persiste_sem_alterar_a_quantidade(self):
        equipamento = self.make_equipamento()
        equipamento.save()

        equipamento.ativo = False
        equipamento.save(update_fields=("ativo",))
        inativo = Equipamento.objects.get(pk=equipamento.pk)
        self.assertFalse(inativo.ativo)
        self.assertEqual(inativo.quantidade_total, 4)

        equipamento.ativo = True
        equipamento.save(update_fields=("ativo",))
        ativo = Equipamento.objects.get(pk=equipamento.pk)
        self.assertTrue(ativo.ativo)
        self.assertEqual(ativo.quantidade_total, 4)
