"""Perfis de acesso do Campus Reservas.

Os perfis são representados pelos grupos do Django, criados pelo comando
``configurar_perfis``.
"""

ADMINISTRADOR = "Administrador"
RESPONSAVEL = "Responsável"
SOLICITANTE = "Solicitante"

PERFIL_ADMINISTRADOR = "administrador"
PERFIL_RESPONSAVEL = "responsavel"
PERFIL_SOLICITANTE = "solicitante"


def perfil_do_usuario(usuario):
    """Devolve o perfil usado pelo frontend para montar menus e rotas.

    A ordem importa: quem é administrador também pode ser responsável, e
    nesse caso prevalece o perfil com mais acesso.
    """
    nomes_dos_grupos = set(usuario.groups.values_list("name", flat=True))
    if usuario.is_superuser or ADMINISTRADOR in nomes_dos_grupos:
        return PERFIL_ADMINISTRADOR
    if (
        RESPONSAVEL in nomes_dos_grupos
        or usuario.ambientes_sob_responsabilidade.exists()
    ):
        return PERFIL_RESPONSAVEL
    return PERFIL_SOLICITANTE
