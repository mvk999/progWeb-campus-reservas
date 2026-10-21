#!/usr/bin/env python3
"""Verifica a estrutura local da equipe; não valida a aplicação nem o runtime Codex.

Requer Python 3.11+ (tomllib). Não instala dependências, não acessa rede e não escreve.
O frontmatter simples gerado é inspecionado; este script não é um parser YAML geral.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from pathlib import Path


ROLES = {
    "campus_backend": "campus-backend",
    "campus_frontend": "campus-frontend",
    "campus_integracao": "campus-integracao",
    "campus_validador": "campus-validador",
}
SHARED = (
    "AGENTS.md", "README.md", "docs/agentes/protocolo.md",
    "docs/agentes/requisitos.md", "docs/agentes/fontes.md",
    "docs/agentes/avaliacao.md",
)


def inspect_team(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    checked: set[Path] = set()

    def read(relative: str) -> str | None:
        path = root / relative
        if not path.resolve().is_relative_to(root):
            errors.append(f"Caminho fora do repositório: {relative}")
            return None
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"Não foi possível ler {relative}: {exc}")
            return None
        checked.add(path)
        if "[TODO:" in content:
            errors.append(f"Scaffold inacabado: {relative}")
        return content

    for name, skill in ROLES.items():
        relative = f".codex/agents/{name}.toml"
        content = read(relative)
        if content is not None:
            try:
                data = tomllib.loads(content)
            except tomllib.TOMLDecodeError as exc:
                errors.append(f"TOML inválido em {relative}: {exc}")
            else:
                for field in ("name", "description", "developer_instructions"):
                    if not isinstance(data.get(field), str) or not data[field].strip():
                        errors.append(f"Campo obrigatório ausente/vazio: {relative}:{field}")
                if data.get("name") != name:
                    errors.append(f"Nome inconsistente: {relative}")
                skill_path = f".agents/skills/{skill}/SKILL.md"
                instructions = data.get("developer_instructions")
                if not isinstance(instructions, str) or skill_path not in instructions:
                    errors.append(f"Agente sem vínculo com sua skill: {relative}")
                supported = {
                    "name", "description", "developer_instructions", "model",
                    "model_reasoning_effort", "model_reasoning_summary",
                    "model_verbosity", "features", "skills",
                }
                invalid = set(data) - supported
                if invalid:
                    errors.append(f"Campos fora do formato adotado: {relative}: {sorted(invalid)}")

        skill_dir = f".agents/skills/{skill}"
        content = read(f"{skill_dir}/SKILL.md")
        if content is not None:
            match = re.match(r"\A---\n(.*?)\n---(?:\n|$)", content, re.S)
            if not match:
                errors.append(f"Frontmatter ausente: {skill_dir}")
            else:
                expected_name = re.search(r"^name: (.+)$", match[1], re.M)
                if not expected_name or expected_name[1].strip() != skill:
                    errors.append(f"Nome de skill inconsistente: {skill_dir}")
                if not re.search(r'^description: "[^\n]+"$', match[1], re.M):
                    errors.append(f"Descrição simples ausente: {skill_dir}")
        metadata = read(f"{skill_dir}/agents/openai.yaml")
        if metadata is not None and f"${skill}" not in metadata:
            errors.append(f"Prompt de interface sem nome da skill: {skill_dir}")
        references = root / skill_dir / "references"
        if not references.is_dir() or not any(references.glob("*.md")):
            errors.append(f"Referência de trabalho ausente: {skill_dir}")
        else:
            for path in sorted(references.glob("*.md")):
                read(str(path.relative_to(root)))

    for relative in SHARED:
        read(relative)

    for path in sorted(checked):
        if path.suffix != ".md":
            continue
        content = path.read_text(encoding="utf-8")
        for link in re.findall(r"\[[^\]\n]*\]\(([^)\n]+)\)", content):
            target = link.split("#", 1)[0]
            if not target or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target):
                continue
            destination = path.parent / target
            if not destination.resolve().is_relative_to(root) or not destination.exists():
                errors.append(f"Link local inválido em {path.relative_to(root)}: {link}")

    return errors, sorted(str(path.relative_to(root)) for path in checked)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.repo.resolve()
    errors, checked = inspect_team(root)
    print(json.dumps({
        "repository": str(root),
        "team_structure_ok": not errors,
        "checked_files": len(checked),
        "errors": errors,
        "scope": "Estrutura e vínculos locais; não prova carregamento nativo ou funcionamento da aplicação.",
    }, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
