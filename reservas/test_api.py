"""Testes da API de reservas do usuário logado."""

from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from ambientes.models import (
    Ambiente,
    CategoriaAmbiente,
    CategoriaEquipamento,
    Equipamento,
)

from .models import BloqueioAmbiente, Reserva, ReservaEquipamento


Usuario = get_user_model()


class ApiReservasTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.maria = Usuario.objects.create_user(
            username="maria", first_name="Maria", last_name="Souza"
        )
        cls.joao = Usuario.objects.create_user(username="joao")
        cls.responsavel = Usuario.objects.create_user(username="responsavel")
        categoria = CategoriaAmbiente.objects.create(nome="Sala de aula")
        cls.sala = Ambiente.objects.create(
            codigo="PV1-101",
            nome="Sala 101",
            localizacao="Pavilhão 1",
            predio="PV1",
            capacidade=40,
            categoria=categoria,
            responsavel=cls.responsavel,
        )
        cls.sala_inativa = Ambiente.objects.create(
            codigo="PV1-999",
            nome="Sala em reforma",
            localizacao="Pavilhão 1",
            capacidade=40,
            categoria=categoria,
            responsavel=cls.responsavel,
            ativo=False,
        )
        audiovisual = CategoriaEquipamento.objects.create(nome="Audiovisual")
        cls.projetor = Equipamento.objects.create(
            codigo="PROJ-01", nome="Projetor", quantidade_total=2, categoria=audiovisual
        )
        cls.projetor_antigo = Equipamento.objects.create(
            codigo="PROJ-02",
            nome="Projetor antigo",
            quantidade_total=1,
            categoria=audiovisual,
            ativo=False,
        )
        # Datas relativas a "hoje" para o teste não depender do dia em que roda.
        cls.dia = timezone.localdate() + timedelta(days=7)

    def setUp(self):
        self.client.force_login(self.maria)

    @classmethod
    def em(cls, hora, dias=0):
        """Momento no fuso de Brasília, ``dias`` depois do dia do teste."""
        return timezone.make_aware(
            datetime.combine(cls.dia + timedelta(days=dias), time(hora))
        )

    def criar_reserva(self, inicio, fim, status=Reserva.Status.PENDENTE, **extras):
        extras.setdefault("solicitante", self.maria)
        extras.setdefault("ambiente", self.sala)
        return Reserva.objects.create(inicio=inicio, fim=fim, status=status, **extras)


class CriarReservaTests(ApiReservasTestCase):
    def corpo(self, **alteracoes):
        corpo = {
            "environmentCode": "PV1-101",
            "date": self.dia.isoformat(),
            "startTime": "14:00",
            "endTime": "16:00",
            "purpose": "Aula de revisão de Cálculo",
            "participants": 35,
            "observations": "Levar extensão.",
            "equipments": [{"code": "PROJ-01", "quantity": 1}],
        }
        corpo.update(alteracoes)
        return corpo

    def post(self, corpo, client=None, **extra):
        return (client or self.client).post(
            reverse("reservas:minhas"), corpo, content_type="application/json", **extra
        )

    def test_cria_reserva_pendente_do_usuario_logado(self):
        resposta = self.post(self.corpo())

        self.assertEqual(resposta.status_code, 201, resposta.json())
        dados = resposta.json()
        reserva = Reserva.objects.get(pk=dados["id"])
        self.assertEqual(reserva.solicitante, self.maria)
        self.assertEqual(reserva.status, Reserva.Status.PENDENTE)
        self.assertEqual(reserva.inicio, self.em(14))
        self.assertEqual(reserva.fim, self.em(16))
        self.assertEqual(reserva.finalidade, "Aula de revisão de Cálculo")
        self.assertEqual(reserva.participantes, 35)
        self.assertEqual(
            list(reserva.itens_equipamento.values_list("equipamento__codigo", "quantidade")),
            [("PROJ-01", 1)],
        )
        self.assertEqual(
            {chave: dados[chave] for chave in (
                "environmentCode", "environmentName", "date", "startTime", "endTime",
                "status", "statusLabel", "purpose", "participants", "observations",
                "equipments", "requester", "evaluatedBy", "evaluatedAt",
                "justification", "canCancel",
            )},
            {
                "environmentCode": "PV1-101",
                "environmentName": "Sala 101",
                "date": self.dia.isoformat(),
                "startTime": "14:00",
                "endTime": "16:00",
                "status": "PENDENTE",
                "statusLabel": "Pendente",
                "purpose": "Aula de revisão de Cálculo",
                "participants": 35,
                "observations": "Levar extensão.",
                "equipments": [{"code": "PROJ-01", "name": "Projetor", "quantity": 1}],
                "requester": {"username": "maria", "name": "Maria Souza"},
                "evaluatedBy": None,
                "evaluatedAt": None,
                "justification": "",
                "canCancel": True,
            },
        )

    def test_ignora_solicitante_e_status_enviados_pelo_cliente(self):
        resposta = self.post(
            self.corpo(status="APROVADA", solicitante=self.joao.pk, requester="joao")
        )

        self.assertEqual(resposta.status_code, 201)
        reserva = Reserva.objects.get(pk=resposta.json()["id"])
        self.assertEqual(reserva.status, Reserva.Status.PENDENTE)
        self.assertEqual(reserva.solicitante, self.maria)

    def test_equipamentos_e_observacoes_sao_opcionais(self):
        corpo = self.corpo()
        del corpo["equipments"], corpo["observations"]

        resposta = self.post(corpo)

        self.assertEqual(resposta.status_code, 201, resposta.json())
        self.assertEqual(resposta.json()["equipments"], [])

    def test_campos_obrigatorios(self):
        resposta = self.post({})

        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(
            set(resposta.json()),
            {"environmentCode", "date", "startTime", "endTime", "purpose", "participants"},
        )

    def test_ambiente_inexistente_ou_inativo(self):
        for codigo in ("NAO-EXISTE", "PV1-999"):
            with self.subTest(codigo=codigo):
                resposta = self.post(self.corpo(environmentCode=codigo))

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("environmentCode", resposta.json())

    def test_horario_final_depois_do_inicial(self):
        resposta = self.post(self.corpo(startTime="16:00", endTime="14:00"))

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("endTime", resposta.json())

    def test_nao_reserva_horario_passado(self):
        ontem = timezone.localdate() - timedelta(days=1)

        resposta = self.post(self.corpo(date=ontem.isoformat()))

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("startTime", resposta.json())

    def test_participantes_acima_da_capacidade_usa_regra_do_modelo(self):
        resposta = self.post(self.corpo(participants=41))

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("no máximo 40", resposta.json()["participants"][0])
        self.assertFalse(Reserva.objects.exists())

    def test_participantes_minimo(self):
        resposta = self.post(self.corpo(participants=0))

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("participants", resposta.json())

    def test_recusa_horario_com_reserva_aprovada_ou_bloqueio(self):
        aprovada = self.criar_reserva(
            self.em(15), self.em(17), Reserva.Status.APROVADA, solicitante=self.joao
        )
        resposta = self.post(self.corpo())
        self.assertEqual(resposta.status_code, 400)
        self.assertIn("reserva aprovada", resposta.json()["startTime"][0])

        aprovada.delete()
        BloqueioAmbiente.objects.create(
            ambiente=self.sala,
            inicio=self.em(13),
            fim=self.em(15),
            motivo="Manutenção",
            criado_por=self.responsavel,
        )
        resposta = self.post(self.corpo())
        self.assertEqual(resposta.status_code, 400)
        self.assertIn("bloqueado", resposta.json()["startTime"][0])

    def test_aceita_horario_com_pendente_ou_consecutivo_a_aprovada(self):
        self.criar_reserva(self.em(14), self.em(16), solicitante=self.joao)
        self.criar_reserva(
            self.em(12), self.em(14), Reserva.Status.APROVADA, solicitante=self.joao
        )

        resposta = self.post(self.corpo())

        self.assertEqual(resposta.status_code, 201, resposta.json())

    def test_equipamento_desconhecido_ou_repetido(self):
        casos = {
            "desconhecido": [{"code": "XYZ", "quantity": 1}],
            "repetido": [
                {"code": "PROJ-01", "quantity": 1},
                {"code": "PROJ-01", "quantity": 1},
            ],
            "quantidade zero": [{"code": "PROJ-01", "quantity": 0}],
        }
        for caso, equipamentos in casos.items():
            with self.subTest(caso):
                resposta = self.post(self.corpo(equipments=equipamentos))

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("equipments", resposta.json())

    def test_erro_no_equipamento_desfaz_a_reserva(self):
        casos = {
            "inativo": {"code": "PROJ-02", "quantity": 1},
            "acima do estoque": {"code": "PROJ-01", "quantity": 3},
        }
        for caso, item in casos.items():
            with self.subTest(caso):
                resposta = self.post(self.corpo(equipments=[item]))

                self.assertEqual(resposta.status_code, 400)
                self.assertTrue(
                    resposta.json()["equipments"][0].startswith(item["code"])
                )
                self.assertFalse(Reserva.objects.exists())
                self.assertFalse(ReservaEquipamento.objects.exists())

    def test_anonimo_recebe_401(self):
        self.client.logout()

        self.assertEqual(self.post(self.corpo()).status_code, 401)

    def test_exige_token_csrf(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.maria)

        resposta = self.post(self.corpo(), client=client)

        self.assertEqual(resposta.status_code, 403)
        self.assertFalse(Reserva.objects.exists())


class ListarReservasTests(ApiReservasTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        agora = timezone.now().replace(microsecond=0)
        cls.depois = Reserva.objects.create(
            solicitante=cls.maria, ambiente=cls.sala,
            inicio=agora + timedelta(days=3), fim=agora + timedelta(days=3, hours=1),
        )
        cls.antes = Reserva.objects.create(
            solicitante=cls.maria, ambiente=cls.sala,
            inicio=agora + timedelta(days=1), fim=agora + timedelta(days=1, hours=1),
        )
        cls.em_andamento = Reserva.objects.create(
            solicitante=cls.maria, ambiente=cls.sala, status=Reserva.Status.APROVADA,
            inicio=agora - timedelta(hours=1), fim=agora + timedelta(hours=1),
        )
        cls.passada = Reserva.objects.create(
            solicitante=cls.maria, ambiente=cls.sala, status=Reserva.Status.CONCLUIDA,
            inicio=agora - timedelta(days=2), fim=agora - timedelta(days=2, hours=-1),
        )
        cls.mais_antiga = Reserva.objects.create(
            solicitante=cls.maria, ambiente=cls.sala, status=Reserva.Status.CANCELADA,
            inicio=agora - timedelta(days=5), fim=agora - timedelta(days=5, hours=-1),
        )
        cls.de_outro = Reserva.objects.create(
            solicitante=cls.joao, ambiente=cls.sala,
            inicio=agora + timedelta(days=2), fim=agora + timedelta(days=2, hours=1),
        )

    def ids(self, **params):
        resposta = self.client.get(reverse("reservas:minhas"), params)
        self.assertEqual(resposta.status_code, 200)
        return [reserva["id"] for reserva in resposta.json()]

    def test_proximas_em_ordem_de_inicio(self):
        esperado = [self.em_andamento.pk, self.antes.pk, self.depois.pk]

        self.assertEqual(self.ids(), esperado)
        self.assertEqual(self.ids(scope="upcoming"), esperado)

    def test_historico_da_mais_recente_para_a_mais_antiga(self):
        self.assertEqual(
            self.ids(scope="history"), [self.passada.pk, self.mais_antiga.pk]
        )

    def test_escopo_invalido(self):
        resposta = self.client.get(reverse("reservas:minhas"), {"scope": "todas"})

        self.assertEqual(resposta.status_code, 400)
        self.assertIn("scope", resposta.json())

    def test_detalhe_da_propria_reserva(self):
        resposta = self.client.get(reverse("reservas:detalhe", args=[self.antes.pk]))

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()["id"], self.antes.pk)

    def test_reserva_de_outro_usuario_retorna_404(self):
        resposta = self.client.get(reverse("reservas:detalhe", args=[self.de_outro.pk]))

        self.assertEqual(resposta.status_code, 404)

    def test_anonimo_recebe_401(self):
        self.client.logout()

        self.assertEqual(self.client.get(reverse("reservas:minhas")).status_code, 401)


class CancelarReservaTests(ApiReservasTestCase):
    def cancelar(self, reserva):
        return self.client.post(reverse("reservas:cancelar", args=[reserva.pk]))

    def test_cancela_pendente_ou_aprovada_futura(self):
        for status in (Reserva.Status.PENDENTE, Reserva.Status.APROVADA):
            with self.subTest(status=status):
                reserva = self.criar_reserva(
                    self.em(8), self.em(9), status,
                    avaliado_por=self.responsavel if status == "APROVADA" else None,
                    avaliado_em=timezone.now() if status == "APROVADA" else None,
                )

                resposta = self.cancelar(reserva)

                self.assertEqual(resposta.status_code, 200, resposta.json())
                self.assertEqual(resposta.json()["status"], "CANCELADA")
                self.assertFalse(resposta.json()["canCancel"])
                reserva.refresh_from_db()
                self.assertEqual(reserva.status, Reserva.Status.CANCELADA)
                reserva.delete()

    def test_nao_cancela_reserva_ja_iniciada_ou_encerrada(self):
        agora = timezone.now()
        reservas = {
            "em andamento": self.criar_reserva(
                agora - timedelta(hours=1), agora + timedelta(hours=1)
            ),
            "rejeitada": self.criar_reserva(
                self.em(8), self.em(9), Reserva.Status.REJEITADA
            ),
            "cancelada": self.criar_reserva(
                self.em(10), self.em(11), Reserva.Status.CANCELADA
            ),
        }
        for caso, reserva in reservas.items():
            with self.subTest(caso):
                status_antes = reserva.status

                resposta = self.cancelar(reserva)

                self.assertEqual(resposta.status_code, 400)
                self.assertIn("non_field_errors", resposta.json())
                reserva.refresh_from_db()
                self.assertEqual(reserva.status, status_antes)

    def test_reserva_de_outro_usuario_retorna_404(self):
        reserva = self.criar_reserva(self.em(8), self.em(9), solicitante=self.joao)

        resposta = self.cancelar(reserva)

        self.assertEqual(resposta.status_code, 404)
        reserva.refresh_from_db()
        self.assertEqual(reserva.status, Reserva.Status.PENDENTE)

    def test_aceita_apenas_post(self):
        reserva = self.criar_reserva(self.em(8), self.em(9))

        resposta = self.client.get(reverse("reservas:cancelar", args=[reserva.pk]))

        self.assertEqual(resposta.status_code, 405)

    def test_can_cancel_na_listagem(self):
        self.criar_reserva(self.em(8), self.em(9))
        self.criar_reserva(self.em(10), self.em(11), Reserva.Status.REJEITADA)

        resposta = self.client.get(reverse("reservas:minhas"))

        self.assertEqual([r["canCancel"] for r in resposta.json()], [True, False])
