"""Testes da API de gestão de reservas."""

from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)
from usuarios.perfis import ADMINISTRADOR, RESPONSAVEL

from .models import BloqueioAmbiente, Reserva, ReservaEquipamento

Usuario = get_user_model()


class GestaoTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.maria = Usuario.objects.create_user(username="maria")
        cls.joao = Usuario.objects.create_user(username="joao")
        cls.ana = Usuario.objects.create_user(
            username="ana", first_name="Ana", last_name="Responsável"
        )
        cls.bruno = Usuario.objects.create_user(username="bruno")
        cls.admin = Usuario.objects.create_user(username="admin")
        cls.admin.groups.add(Group.objects.create(name=ADMINISTRADOR))
        cls.responsavel_sem_ambiente = Usuario.objects.create_user(username="carla")
        cls.responsavel_sem_ambiente.groups.add(Group.objects.create(name=RESPONSAVEL))

        categoria = CategoriaAmbiente.objects.create(nome="Sala de aula")
        cls.sala_ana = Ambiente.objects.create(
            codigo="PV1-101",
            nome="Sala 101",
            localizacao="Pavilhão 1",
            predio="PV1",
            capacidade=40,
            categoria=categoria,
            responsavel=cls.ana,
        )
        cls.sala_bruno = Ambiente.objects.create(
            codigo="PV2-201",
            nome="Sala 201",
            localizacao="Pavilhão 2",
            predio="PV2",
            capacidade=40,
            categoria=categoria,
            responsavel=cls.bruno,
        )
        cls.projetor = Equipamento.objects.create(
            codigo="PROJ-01",
            nome="Projetor",
            quantidade_total=2,
            categoria=CategoriaEquipamento.objects.create(nome="Audiovisual"),
        )
        # Datas relativas a "hoje" para o teste não depender do dia em que roda.
        cls.dia = timezone.localdate() + timedelta(days=7)

    @classmethod
    def em(cls, hora, dias=0):
        return timezone.make_aware(
            datetime.combine(cls.dia + timedelta(days=dias), time(hora))
        )

    def reserva(self, inicio=8, fim=10, status=Reserva.Status.PENDENTE, **extras):
        extras.setdefault("solicitante", self.maria)
        extras.setdefault("ambiente", self.sala_ana)
        if not isinstance(inicio, datetime):
            inicio, fim = self.em(inicio), self.em(fim)
        if status in (Reserva.Status.APROVADA, Reserva.Status.REJEITADA):
            extras.setdefault("avaliado_por", self.admin)
            extras.setdefault("avaliado_em", timezone.now())
        return Reserva.objects.create(inicio=inicio, fim=fim, status=status, **extras)

    def post(self, nome_rota, reserva, corpo=None):
        return self.client.post(
            reverse(f"reservas:{nome_rota}", args=[reserva.pk]),
            corpo or {},
            content_type="application/json",
        )


class AcessoGestaoTests(GestaoTestCase):
    def test_anonimo_recebe_401_e_solicitante_403(self):
        reserva = self.reserva()
        rotas = [
            ("get", reverse("reservas:gestao")),
            ("get", reverse("reservas:ocupacao")),
            ("post", reverse("reservas:aprovar", args=[reserva.pk])),
            ("post", reverse("reservas:rejeitar", args=[reserva.pk])),
        ]
        for usuario, esperado in ((None, 401), (self.maria, 403)):
            if usuario:
                self.client.force_login(usuario)
            for metodo, url in rotas:
                with self.subTest(usuario=usuario, url=url):
                    self.assertEqual(
                        getattr(self.client, metodo)(url).status_code, esperado
                    )
        reserva.refresh_from_db()
        self.assertEqual(reserva.status, Reserva.Status.PENDENTE)


class ListaGestaoTests(GestaoTestCase):
    def setUp(self):
        self.da_ana = self.reserva(8, 10)
        self.da_ana_aprovada = self.reserva(10, 12, Reserva.Status.APROVADA)
        self.da_ana_amanha = self.reserva(self.em(8, dias=1), self.em(9, dias=1))
        self.do_bruno = self.reserva(8, 10, ambiente=self.sala_bruno)

    def ids(self, usuario, **params):
        self.client.force_login(usuario)
        resposta = self.client.get(reverse("reservas:gestao"), params)
        self.assertEqual(resposta.status_code, 200, resposta.content)
        return [reserva["id"] for reserva in resposta.json()]

    def test_responsavel_ve_apenas_os_proprios_ambientes(self):
        self.assertEqual(
            self.ids(self.ana),
            [self.da_ana.pk, self.da_ana_aprovada.pk, self.da_ana_amanha.pk],
        )
        self.assertEqual(self.ids(self.bruno), [self.do_bruno.pk])
        self.assertEqual(self.ids(self.responsavel_sem_ambiente), [])

    def test_administrador_ve_todos(self):
        self.assertEqual(len(self.ids(self.admin)), 4)

    def test_filtros(self):
        self.assertEqual(
            self.ids(self.ana, status="PENDENTE"),
            [self.da_ana.pk, self.da_ana_amanha.pk],
        )
        self.assertEqual(
            self.ids(self.admin, environment="pv2-201"), [self.do_bruno.pk]
        )
        self.assertEqual(
            self.ids(self.ana, date=self.dia.isoformat()),
            [self.da_ana.pk, self.da_ana_aprovada.pk],
        )

    def test_filtro_invalido(self):
        self.client.force_login(self.ana)

        resposta = self.client.get(reverse("reservas:gestao"), {"status": "X"})

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("status", resposta.json())

    def test_has_conflict_avisa_pendente_sobreposta(self):
        self.reserva(9, 11, solicitante=self.joao)  # pendente: não conflita
        conflita = self.reserva(11, 13, solicitante=self.joao)  # sobre a aprovada
        self.client.force_login(self.ana)

        resposta = self.client.get(reverse("reservas:gestao"), {"status": "PENDENTE"})

        conflitos = {r["id"]: r["hasConflict"] for r in resposta.json()}
        self.assertFalse(conflitos[self.da_ana.pk])
        self.assertTrue(conflitos[conflita.pk])


class AprovarTests(GestaoTestCase):
    def setUp(self):
        self.client.force_login(self.ana)

    def test_aprova_e_registra_avaliacao(self):
        reserva = self.reserva()

        resposta = self.post("aprovar", reserva)

        self.assertEqual(resposta.status_code, 200, resposta.json())
        self.assertEqual(resposta.json()["status"], "APROVADA")
        self.assertEqual(resposta.json()["evaluatedBy"], "Ana Responsável")
        reserva.refresh_from_db()
        self.assertEqual(reserva.status, Reserva.Status.APROVADA)
        self.assertEqual(reserva.avaliado_por, self.ana)
        self.assertIsNotNone(reserva.avaliado_em)

    def test_administrador_aprova_qualquer_ambiente(self):
        reserva = self.reserva(ambiente=self.sala_bruno)
        self.client.force_login(self.admin)

        self.assertEqual(self.post("aprovar", reserva).status_code, 200)

    def test_reserva_de_outro_responsavel_retorna_404(self):
        reserva = self.reserva(ambiente=self.sala_bruno)

        self.assertEqual(self.post("aprovar", reserva).status_code, 404)
        reserva.refresh_from_db()
        self.assertEqual(reserva.status, Reserva.Status.PENDENTE)

    def test_so_aprova_pendente_que_nao_comecou(self):
        agora = timezone.now()
        reservas = {
            "rejeitada": self.reserva(
                status=Reserva.Status.REJEITADA, justificativa="x"
            ),
            "cancelada": self.reserva(status=Reserva.Status.CANCELADA),
            "já começou": self.reserva(
                agora - timedelta(hours=1), agora + timedelta(hours=1)
            ),
        }
        for caso, reserva in reservas.items():
            with self.subTest(caso):
                status_antes = reserva.status

                resposta = self.post("aprovar", reserva)

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("non_field_errors", resposta.json())
                reserva.refresh_from_db()
                self.assertEqual(reserva.status, status_antes)

    def test_regras_do_modelo_impedem_a_aprovacao(self):
        self.reserva(8, 10, Reserva.Status.APROVADA, solicitante=self.joao)
        BloqueioAmbiente.objects.create(
            ambiente=self.sala_ana,
            inicio=self.em(14),
            fim=self.em(16),
            motivo="Manutenção",
            criado_por=self.ana,
        )
        casos = {
            "sobreposta a aprovada": (self.reserva(9, 11), "reserva aprovada"),
            "durante bloqueio": (self.reserva(15, 17), "bloqueado"),
            "própria reserva": (
                self.reserva(18, 19, solicitante=self.ana),
                "não pode avaliar a própria reserva",
            ),
        }
        for caso, (reserva, trecho) in casos.items():
            with self.subTest(caso):
                resposta = self.post("aprovar", reserva)

                self.assertEqual(resposta.status_code, 400)
                self.assertIn(trecho, " ".join(resposta.json()["non_field_errors"]))
                reserva.refresh_from_db()
                self.assertEqual(reserva.status, Reserva.Status.PENDENTE)
                self.assertIsNone(reserva.avaliado_por)

    def test_estoque_de_equipamentos_no_horario(self):
        primeira = self.reserva(8, 10)
        segunda = self.reserva(9, 11, solicitante=self.joao, ambiente=self.sala_bruno)
        for reserva in (primeira, segunda):
            ReservaEquipamento.objects.create(
                reserva=reserva, equipamento=self.projetor, quantidade=2
            )
        self.assertEqual(self.post("aprovar", primeira).status_code, 200)
        self.client.force_login(self.bruno)

        resposta = self.post("aprovar", segunda)

        self.assertEqual(resposta.status_code, 400)
        self.assertTrue(resposta.json()["equipments"][0].startswith("PROJ-01:"))
        segunda.refresh_from_db()
        self.assertEqual(segunda.status, Reserva.Status.PENDENTE)


class RejeitarTests(GestaoTestCase):
    def setUp(self):
        self.client.force_login(self.ana)

    def test_rejeita_com_justificativa(self):
        reserva = self.reserva()

        resposta = self.post("rejeitar", reserva, {"justification": "Sala em uso."})

        self.assertEqual(resposta.status_code, 200, resposta.json())
        reserva.refresh_from_db()
        self.assertEqual(reserva.status, Reserva.Status.REJEITADA)
        self.assertEqual(reserva.justificativa, "Sala em uso.")
        self.assertEqual(reserva.avaliado_por, self.ana)

    def test_justificativa_obrigatoria(self):
        reserva = self.reserva()

        for corpo in ({}, {"justification": "   "}):
            with self.subTest(corpo=corpo):
                resposta = self.post("rejeitar", reserva, corpo)

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("justification", resposta.json())
        reserva.refresh_from_db()
        self.assertEqual(reserva.status, Reserva.Status.PENDENTE)

    def test_so_rejeita_pendente(self):
        reserva = self.reserva(status=Reserva.Status.APROVADA)

        resposta = self.post("rejeitar", reserva, {"justification": "x"})

        self.assertEqual(resposta.status_code, 400)


class OcupacaoTests(GestaoTestCase):
    def ocupacao(self, usuario, **params):
        self.client.force_login(usuario)
        return self.client.get(reverse("reservas:ocupacao"), params)

    def test_itens_do_periodo_por_dia(self):
        aprovada = self.reserva(8, 10, Reserva.Status.APROVADA)
        pendente = self.reserva(self.em(14, dias=1), self.em(15, dias=1))
        self.reserva(10, 11, Reserva.Status.REJEITADA, justificativa="x")
        self.reserva(10, 11, ambiente=self.sala_bruno)  # outro responsável
        bloqueio = BloqueioAmbiente.objects.create(
            ambiente=self.sala_ana,
            inicio=self.em(20),
            fim=self.em(6, dias=1),
            motivo="Evento",
            criado_por=self.ana,
        )
        dia, amanha = self.dia.isoformat(), (self.dia + timedelta(days=1)).isoformat()
        sala = {
            "environmentCode": "PV1-101",
            "environmentName": "Sala 101",
            "buildingCode": "PV1",
        }

        resposta = self.ocupacao(self.ana, start=dia, end=amanha)

        self.assertEqual(resposta.status_code, 200, resposta.content)
        self.assertEqual(
            resposta.json(),
            {
                "start": dia,
                "end": amanha,
                "items": [
                    {
                        "id": f"reserva-{aprovada.pk}",
                        "date": dia,
                        "startTime": "08:00",
                        "endTime": "10:00",
                        "type": "APROVADA",
                        **sala,
                    },
                    {
                        "id": f"bloqueio-{bloqueio.pk}",
                        "date": dia,
                        "startTime": "20:00",
                        "endTime": "24:00",
                        "type": "BLOQUEIO",
                        "reason": "Evento",
                        **sala,
                    },
                    {
                        "id": f"bloqueio-{bloqueio.pk}",
                        "date": amanha,
                        "startTime": "00:00",
                        "endTime": "06:00",
                        "type": "BLOQUEIO",
                        "reason": "Evento",
                        **sala,
                    },
                    {
                        "id": f"reserva-{pendente.pk}",
                        "date": amanha,
                        "startTime": "14:00",
                        "endTime": "15:00",
                        "type": "PENDENTE",
                        **sala,
                    },
                ],
            },
        )

    def test_periodo_corta_intervalos_fora_dele(self):
        self.reserva(self.em(8, dias=1), self.em(9, dias=1))
        dia = self.dia.isoformat()

        resposta = self.ocupacao(self.admin, start=dia, end=dia)

        self.assertEqual(resposta.json()["items"], [])

    def test_periodo_invalido(self):
        dia = self.dia
        casos = {
            "sem datas": {},
            "fim antes do início": {
                "start": dia.isoformat(),
                "end": (dia - timedelta(days=1)).isoformat(),
            },
            "longo demais": {
                "start": dia.isoformat(),
                "end": (dia + timedelta(days=62)).isoformat(),
            },
        }
        for caso, params in casos.items():
            with self.subTest(caso):
                self.assertEqual(self.ocupacao(self.admin, **params).status_code, 400)
