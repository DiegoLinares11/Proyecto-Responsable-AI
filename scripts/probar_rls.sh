#!/usr/bin/env bash
# ===========================================================================
# Corre las migraciones y las pruebas de RLS contra un clúster PostgreSQL
# desechable, sin proyecto remoto y sin Docker.
#
# Levanta su propio clúster en un directorio temporal, aplica el shim de
# Supabase, aplica todas las migraciones en orden, corre tests/rls y apaga
# todo. No toca ninguna base existente de la máquina.
#
#   ./scripts/probar_rls.sh
#
# Requiere PostgreSQL instalado (initdb, pg_ctl y psql en el PATH, o la ruta
# estándar de instalación en Windows).
# ===========================================================================

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUERTO="${PGPUERTO_PRUEBA:-55432}"
TRABAJO="$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/rai-pruebas-$$")"
DATOS="$TRABAJO/cluster"
BD="rai_test"

# En Windows los binarios no suelen estar en el PATH.
if ! command -v initdb >/dev/null 2>&1; then
  for v in 18 17 16; do
    if [ -x "/c/Program Files/PostgreSQL/$v/bin/initdb" ]; then
      export PATH="/c/Program Files/PostgreSQL/$v/bin:$PATH"
      break
    fi
  done
fi

if ! command -v initdb >/dev/null 2>&1; then
  echo "No encuentro initdb. Instala PostgreSQL o ponlo en el PATH." >&2
  exit 1
fi

limpiar() {
  pg_ctl -D "$DATOS" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$TRABAJO" 2>/dev/null || true
}
trap limpiar EXIT

echo "Levantando clúster desechable en el puerto $PUERTO..."
initdb -D "$DATOS" -U postgres --auth=trust --encoding=UTF8 --locale=C >"$TRABAJO/initdb.log" 2>&1
pg_ctl -D "$DATOS" -o "-p $PUERTO -c listen_addresses=127.0.0.1" -l "$TRABAJO/pg.log" -w start >/dev/null

PSQL=(psql -h 127.0.0.1 -p "$PUERTO" -U postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -d postgres -c "create database $BD;" >/dev/null

echo "Aplicando el shim de Supabase..."
"${PSQL[@]}" -d "$BD" -f "$RAIZ/scripts/shim_supabase_local.sql" >/dev/null

echo "Aplicando migraciones..."
for f in "$RAIZ"/supabase/migrations/*.sql; do
  printf '  %s\n' "$(basename "$f")"
  "${PSQL[@]}" -d "$BD" -f "$f" >/dev/null
done

echo ""
echo "Corriendo pruebas de RLS..."
echo ""

# Los resultados salen por NOTICE; el ruido de psql sobra.
if "${PSQL[@]}" -d "$BD" -f "$RAIZ/tests/rls/pruebas_rls.sql" 2>&1 \
     | sed -E 's/^psql:.*\.sql:[0-9]+: (NOTICE|ERROR): +//' \
     | grep -vE '^\s*$'
then
  echo ""
  exit 0
else
  echo ""
  echo "Las pruebas fallaron." >&2
  exit 1
fi
