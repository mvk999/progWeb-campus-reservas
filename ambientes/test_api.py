"""Testes da API de ambientes e equipamentos."""

from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from reservas.models import BloqueioAmbiente, Reserva

from .models import Ambiente, CategoriaAmbiente, CategoriaEquipamento, Equipamento


Usuario = get_user_model()


class ApiAmbientesTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = Usuario.objects.create_user(username="consulta")
        cls.responsavel = Usuario.objects.create_user(
            username="jlima", first_name="João", last_name="Lima"
        )
        cls.sem_nome = Usuario.objects.create_user(username="semnome")
        cls.sala = CategoriaAmbiente.objects.create(nome="Sala de aula")
        cls.laboratorio = CategoriaAmbiente.objects.create(nome="Laboratório")
        cls.sala_101 = Ambiente.objects.create(
            codigo="PV1-101",
            nome="Sala 101",
            descricao="Sala com projetor.",
            localizacao="Pavilhão 1, térreo",
            predio="PV1",
            capacidade=40,
            categoria=cls.sala,
            responsavel=cls.responsavel,
        )
        cls.lab = Ambiente.objects.create(
            codigo="DCC-LAB1",
            nome="Laboratório de Redes",
            localizacao="Departamento de Computação",
            predio="DCC",
            capacidade=20,
            categoria=cls.laboratorio,
            responsavel=cls.sem_nome,
        )
        cls.inativo = Ambiente.objects.create(
            codigo="PV1-999",
            nome="Sala em reforma",
            localizacao="Pavilhão 1",
            predio="PV1",
            capacidade=30,
            categoria=cls.sala,
            responsavel=cls.responsavel,
            ativo=False,
        )

    def setUp(self):
        self.client.force_login(self.usuario)

    def get(self, nome_rota, *args, **params):
        return self.client.get(reverse(nome_rota, args=args), params)


class AmbienteListaTests(ApiAmbientesTestCase):
    def codigos(self, resposta):
        self.assertEqual(resposta.status_code, 200)
        return [ambiente["code"] for ambiente in resposta.json()]

    def test_anonimo_recebe_401(self):
        self.client.logout()

        self.assertEqual(self.get("ambientes:lista").status_code, 401)

    def test_lista_apenas_ativos_no_formato_do_contrato(self):
        resposta = self.get("ambientes:lista")

        self.assertEqual(self.codigos(resposta), ["DCC-LAB1", "PV1-101"])
        self.assertEqual(
            resposta.json()[1],
            {
                "code": "PV1-101",
                "name": "Sala 101",
                "category": "Sala de aula",
                "location": "Pavilhão 1, térreo",
                "buildingCode": "PV1",
                "capacity": 40,
                "responsible": "João Lima",
                "features": [],
            },
        )

    def test_responsavel_sem_nome_mostra_usuario(self):
        resposta = self.get("ambientes:lista")

        self.assertEqual(resposta.json()[0]["responsible"], "semnome")

    def test_filtros(self):
        casos = {
            "categoria": ({"category": "laboratório"}, ["DCC-LAB1"]),
            "prédio": ({"building": "pv1"}, ["PV1-101"]),
            "capacidade mínima": ({"minimumCapacity": 21}, ["PV1-101"]),
            "busca por código": ({"q": "lab1"}, ["DCC-LAB1"]),
            "busca por nome": ({"q": "sala 1"}, ["PV1-101"]),
            "busca por localização": ({"q": "computação"}, ["DCC-LAB1"]),
            "filtros combinados": ({"building": "PV1", "minimumCapacity": 50}, []),
        }
        for caso, (params, esperado) in casos.items():
            with self.subTest(caso):
                self.assertEqual(
                    self.codigos(self.get("ambientes:lista", **params)), esperado
                )

    def test_capacidade_minima_invalida(self):
        for valor in ("abc", "0"):
            with self.subTest(valor=valor):
                resposta = self.get("ambientes:lista", minimumCapacity=valor)

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("minimumCapacity", resposta.json())


class AmbienteDetalheTests(ApiAmbientesTestCase):
    def test_detalhe_inclui_descricao(self):
        resposta = self.get("ambientes:detalhe", "PV1-101")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["code"], "PV1-101")
        self.assertEqual(resposta.json()["description"], "Sala com projetor.")

    def test_inativo_ou_inexistente_retorna_404(self):
        for codigo in ("PV1-999", "NAO-EXISTE"):
            with self.subTest(codigo=codigo):
                self.assertEqual(
                    self.get("ambientes:detalhe", codigo).status_code, 404
                )


class DisponibilidadeTests(ApiAmbientesTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # Datas relativas a "hoje" para o teste não depender do dia em que roda.
        cls.dia = timezone.localdate() + timedelta(days=5)

        def reserva(inicio, fim, status, ambiente=None):
            return Reserva.objects.create(
                solicitante=cls.usuario,
                ambiente=ambiente or cls.sala_101,
                inicio=inicio,
                fim=fim,
                status=status,
            )

        reserva(cls.as_(8), cls.as_(10), Reserva.Status.APROVADA)
        reserva(cls.as_(10), cls.as_(12), Reserva.Status.PENDENTE)
        reserva(cls.as_(13), cls.as_(14), Reserva.Status.REJEITADA)
        reserva(cls.as_(13), cls.as_(14), Reserva.Status.CANCELADA)
        reserva(cls.as_(8), cls.as_(9), Reserva.Status.APROVADA, ambiente=cls.lab)
        reserva(cls.as_(8, dias=1), cls.as_(9, dias=1), Reserva.Status.APROVADA)
        BloqueioAmbiente.objects.create(
            ambiente=cls.sala_101,
            inicio=cls.as_(14),
            fim=cls.as_(18),
            motivo="Manutenção",
            criado_por=cls.responsavel,
        )

    @classmethod
    def as_(cls, hora, dias=0):
        """Momento no fuso de Brasília, ``dias`` depois do dia do teste."""
        return timezone.make_aware(
            datetime.combine(cls.dia + timedelta(days=dias), time(hora))
        )

    def disponibilidade(self, codigo="PV1-101", **params):
        params.setdefault("date", self.dia.isoformat())
        return self.get("ambientes:disponibilidade", codigo, **params)

    def test_lista_aprovadas_pendentes_e_bloqueios_do_dia(self):
        resposta = self.disponibilidade()

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(
            resposta.json(),
            {
                "environmentCode": "PV1-101",
                "date": self.dia.isoformat(),
                "occupied": [
                    {"startTime": "08:00", "endTime": "10:00", "type": "APROVADA"},
                    {"startTime": "10:00", "endTime": "12:00", "type": "PENDENTE"},
                    {
                        "startTime": "14:00",
                        "endTime": "18:00",
                        "type": "BLOQUEIO",
                        "reason": "Manutenção",
                    },
                ],
            },
        )

    def test_intervalo_de_varios_dias_e_cortado_no_dia(self):
        BloqueioAmbiente.objects.create(
            ambiente=self.lab,
            inicio=self.as_(20, dias=-1),
            fim=self.as_(6, dias=1),
            motivo="Recesso",
            criado_por=self.responsavel,
        )

        resposta = self.disponibilidade("DCC-LAB1")

        self.assertEqual(
            resposta.json()["occupied"],
            [
                {
                    "startTime": "00:00",
                    "endTime": "24:00",
                    "type": "BLOQUEIO",
                    "reason": "Recesso",
                },
                {"startTime": "08:00", "endTime": "09:00", "type": "APROVADA"},
            ],
        )

    def test_dia_livre(self):
        resposta = self.disponibilidade(date=(self.dia + timedelta(days=2)).isoformat())

        self.assertEqual(resposta.json()["occupied"], [])

    def test_data_obrigatoria_e_valida(self):
        for params in ({"date": ""}, {"date": "20-11-2026"}, {"date": "2026-02-30"}):
            with self.subTest(params=params):
                resposta = self.disponibilidade(**params)

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("date", resposta.json())

    def test_ambiente_inativo_retorna_404(self):
        self.assertEqual(self.disponibilidade("PV1-999").status_code, 404)


class CategoriasEquipamentosTests(ApiAmbientesTestCase):
    def test_categorias_em_ordem_alfabetica(self):
        resposta = self.get("ambientes:categorias")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(
            resposta.json(), [{"name": "Laboratório"}, {"name": "Sala de aula"}]
        )

    def test_equipamentos_apenas_ativos(self):
        categoria = CategoriaEquipamento.objects.create(nome="Audiovisual")
        Equipamento.objects.create(
            codigo="PROJ-01",
            nome="Projetor",
            quantidade_total=3,
            categoria=categoria,
        )
        Equipamento.objects.create(
            codigo="PROJ-02",
            nome="Projetor antigo",
            quantidade_total=1,
            categoria=categoria,
            ativo=False,
        )

        resposta = self.get("ambientes:equipamentos")

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(
            resposta.json(),
            [
                {
                    "code": "PROJ-01",
                    "name": "Projetor",
                    "category": "Audiovisual",
                    "totalQuantity": 3,
                }
            ],
        )

    def test_anonimo_recebe_401(self):
        self.client.logout()

        for rota in ("ambientes:categorias", "ambientes:equipamentos"):
            with self.subTest(rota=rota):
                self.assertEqual(self.get(rota).status_code, 401)
