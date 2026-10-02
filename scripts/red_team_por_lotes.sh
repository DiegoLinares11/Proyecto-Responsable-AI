#!/usr/bin/env bash
# Corre el corpus por categorías, acumulando en un solo log.
#
# Hace falta porque una corrida completa dura ~30 minutos y excede el límite de
# las tareas en segundo plano. Es resumible: las categorías que ya estén en el
# log se saltan, así que si la matan, se vuelve a lanzar y sigue donde iba.
#
#   bash scripts/red_team_por_lotes.sh tests/redteam/resultados/despues.log
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
SALIDA="${1:-tests/redteam/resultados/por-lotes.log}"
touch "$SALIDA"

for c in inyeccion_directa tarea_escondida inyeccion_indirecta juego_de_roles \
         codificacion escalada_multiturno extraccion_del_sistema fuga_de_datos falso_positivo; do
  if grep -q "### $c LISTA" "$SALIDA"; then
    echo "### $c ya estaba, se salta"
    continue
  fi
  echo "### $c empieza"
  node scripts/red_team.mjs --categoria "$c" >> "$SALIDA" 2>&1 || true
  echo "### $c LISTA" >> "$SALIDA"
  echo "### $c LISTA"
done
echo "### TODAS LAS CATEGORIAS LISTAS"
