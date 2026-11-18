"""Serializers da API de usuários e autenticação."""

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .perfis import SOLICITANTE, perfil_do_usuario


Usuario = get_user_model()


class UsuarioSerializer(serializers.ModelSerializer):
    """Dados do usuário devolvidos pela API (somente leitura)."""

    firstName = serializers.CharField(source="first_name", read_only=True)
    lastName = serializers.CharField(source="last_name", read_only=True)
    profile = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ("id", "username", "firstName", "lastName", "email", "profile")
        read_only_fields = fields

    def get_profile(self, usuario):
        return perfil_do_usuario(usuario)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate(self, dados):
        # authenticate() devolve None para senha errada, usuário inexistente
        # e conta inativa. A mensagem é a mesma nos três casos para não
        # revelar quais nomes de usuário existem.
        usuario = authenticate(
            request=self.context.get("request"),
            username=dados["username"],
            password=dados["password"],
        )
        if usuario is None:
            raise serializers.ValidationError("Usuário ou senha inválidos.")
        dados["usuario"] = usuario
        return dados


class CadastroSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    firstName = serializers.CharField(max_length=150)
    lastName = serializers.CharField(max_length=150)
    password = serializers.CharField(trim_whitespace=False, write_only=True)
    passwordConfirmation = serializers.CharField(
        trim_whitespace=False, write_only=True
    )

    def validate_username(self, username):
        # Reaproveita o validador de caracteres do próprio modelo.
        campo = Usuario._meta.get_field("username")
        try:
            campo.run_validators(username)
        except DjangoValidationError as erro:
            raise serializers.ValidationError(erro.messages)
        if Usuario.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return username

    def validate_email(self, email):
        email = Usuario.objects.normalize_email(email)
        if Usuario.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Este e-mail já está cadastrado.")
        return email

    def validate(self, dados):
        if dados["password"] != dados["passwordConfirmation"]:
            raise serializers.ValidationError(
                {"passwordConfirmation": "As senhas não conferem."}
            )
        # Regras de senha do settings (AUTH_PASSWORD_VALIDATORS). O usuário
        # ainda não salvo permite comparar a senha com nome e e-mail.
        usuario = Usuario(
            username=dados["username"],
            email=dados["email"],
            first_name=dados["firstName"],
            last_name=dados["lastName"],
        )
        try:
            validate_password(dados["password"], user=usuario)
        except DjangoValidationError as erro:
            raise serializers.ValidationError({"password": erro.messages})
        return dados

    @transaction.atomic
    def create(self, dados):
        usuario = Usuario.objects.create_user(
            username=dados["username"],
            email=dados["email"],
            password=dados["password"],
            first_name=dados["firstName"],
            last_name=dados["lastName"],
        )
        grupo, _ = Group.objects.get_or_create(name=SOLICITANTE)
        usuario.groups.add(grupo)
        return usuario
