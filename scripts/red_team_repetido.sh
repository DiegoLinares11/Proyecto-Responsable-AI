#!/usr/bin/env bash
# Corre una categoría varias veces para medir su variabilidad.
#
# Hace falta porque el modelo es estocástico: en las corridas del 2 de octubre,
# el mismo caso de inyección indirecta pasó una vez y falló otra con el MISMO
# código, y tres casos de tarea escondida fallaron una vez y pasaron la
# siguiente. Una sola corrida no distingue un arreglo de la suerte.
#
#   bash scripts/red_team_repetido.sh inyeccion_indirecta 3
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
CATEGORIA="$1"
VECES="${2:-3}"
SALIDA="tests/redteam/resultados/repetido-$CATEGORIA.log"
: > "$SALIDA"

for i in $(seq 1 "$VECES"); do
  echo "### repeticion $i de $VECES" >> "$SALIDA"
  node scripts/red_team.mjs --categoria "$CATEGORIA" >> "$SALIDA" 2>&1 || true
done

echo "=== $CATEGORIA, $VECES repeticiones ==="
grep -E "^\[" "$SALIDA" | awk '{print $2, ($4=="OK" ? "OK" : "FALLA")}' | sort | uniq -c | sort -k2
