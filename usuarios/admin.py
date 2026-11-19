"""Configuração administrativa do usuário customizado."""

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    """Admin de usuários com o perfil (grupo) fácil de ver e editar.

    O projeto concede acesso pelos grupos Administrador, Responsável e
    Solicitante; permissões individuais são raras e ficam em uma aba própria.
    """

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Informações pessoais", {"fields": ("first_name", "last_name", "email")}),
        (
            "Perfil e acesso",
            {
                "fields": ("groups", "is_active", "is_staff", "is_superuser"),
                "description": (
                    "O grupo define o perfil no sistema. Para um responsável "
                    "avaliar reservas, defina-o também no campo Responsável "
                    "dos ambientes."
                ),
            },
        ),
        (
            "Permissões avançadas",
            {
                "fields": ("user_permissions",),
                "description": (
                    "Permissões individuais, além das que o usuário já recebe "
                    "pelos grupos. Normalmente não é preciso alterar."
                ),
            },
        ),
        ("Datas importantes", {"fields": ("last_login", "date_joined")}),
    )
    # Só as permissões individuais (centenas de opções) usam o quadro duplo
    # com busca; os grupos, que são poucos, viram caixas de seleção.
    filter_horizontal = ("user_permissions",)

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if db_field.name == "groups":
            kwargs["widget"] = forms.CheckboxSelectMultiple
        return super().formfield_for_manytomany(db_field, request, **kwargs)
