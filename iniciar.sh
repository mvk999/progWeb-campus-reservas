#!/usr/bin/env bash
# Inicia o backend (Django) e o frontend (Angular) do Campus Reservas no mesmo
# terminal. Use Ctrl+C para encerrar os dois.
#
# O script não altera o banco de dados: não roda migrate, popular_demo nem
# apaga o db.sqlite3. Ele só sobe os servidores com o banco que já existe.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RAIZ"

PORTA_DJANGO=8000
PORTA_ANGULAR=4200
ENDERECO="http://localhost:${PORTA_ANGULAR}"

erro() { echo "Erro: $*" >&2; exit 1; }

# --- Verificações -------------------------------------------------------------

if [[ -x .venv/bin/python ]]; then
  PYTHON=.venv/bin/python
else
  erro "ambiente virtual não encontrado em .venv. Crie-o e instale as dependências (veja o README)."
fi

command -v npm >/dev/null || erro "npm não encontrado. Instale o Node.js 22 ou mais novo."

[[ -f db.sqlite3 ]] || echo "Aviso: db.sqlite3 não existe; rode 'python manage.py migrate' antes de usar o sistema."

for porta in "$PORTA_DJANGO" "$PORTA_ANGULAR"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/${porta}") 2>/dev/null; then
    erro "a porta ${porta} já está em uso. Feche o servidor que está nela e tente de novo."
  fi
done

if [[ ! -d frontend/node_modules ]]; then
  echo "Instalando as dependências do frontend (só na primeira vez)..."
  (cd frontend && npm ci --no-audit --no-fund)
fi

# --- Encerramento -------------------------------------------------------------

# Ao sair (Ctrl+C ou erro), encerra os dois servidores e tudo o que eles abriram.
encerrar() {
  trap - INT TERM EXIT
  echo
  echo "Encerrando o backend e o frontend..."
  kill 0 2>/dev/null || true
}
trap encerrar INT TERM EXIT

# --- Servidores ---------------------------------------------------------------

# Cada linha de saída ganha um prefixo para saber de qual servidor ela veio.
prefixar() { sed -u "s/^/[$1] /"; }

"$PYTHON" manage.py runserver "127.0.0.1:${PORTA_DJANGO}" 2>&1 | prefixar django &
(cd frontend && npm start -- --port "$PORTA_ANGULAR") 2>&1 | prefixar angular &

# Espera o frontend responder (até 2 minutos) para mostrar o endereço.
for _ in $(seq 1 120); do
  if (exec 3<>"/dev/tcp/127.0.0.1/${PORTA_ANGULAR}") 2>/dev/null; then
    echo
    echo "=================================================================="
    echo " Campus Reservas pronto em ${ENDERECO}"
    echo " Admin: http://127.0.0.1:${PORTA_DJANGO}/admin/"
    echo " Pressione Ctrl+C para encerrar."
    echo "=================================================================="
    echo
    if command -v xdg-open >/dev/null; then
      xdg-open "$ENDERECO" >/dev/null 2>&1 || true
    elif command -v open >/dev/null; then
      open "$ENDERECO" >/dev/null 2>&1 || true
    fi
    break
  fi
  sleep 1
done

wait
