// ===========================================================================
// La sugerencia de ubicación por GPS
//
// Se calcula dentro del teléfono, sin mandar las coordenadas a ningún servicio.
// Es una sugerencia: la personalización depende de la ubicación simulada que el
// usuario confirma (docs/requisitos.md, R-03).
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { CABECERAS, departamentoMasCercano, distanciaKm } from "../../../app-movil/src/lib/cercania.ts";

describe("de coordenadas a departamento", () => {
  test("cada cabecera se reconoce a sí misma", () => {
    for (const c of CABECERAS) {
      assert.equal(departamentoMasCercano(c.lat, c.lon), c.id);
    }
  });

  // Lugares que no son cabecera, para ver que la cercanía funciona.
  test("lugares conocidos caen en su departamento", () => {
    const casos: [string, number, number, string][] = [
      ["Mixco", 14.6333, -90.6064, "GT-GU"],
      ["Panajachel", 14.7404, -91.1594, "GT-SO"],
      ["Tikal", 17.2221, -89.6237, "GT-PE"],
      ["Puerto San José", 13.9256, -90.8233, "GT-ES"],
      ["Salcajá", 14.8833, -91.45, "GT-QZ"],
    ];
    for (const [lugar, lat, lon, esperado] of casos) {
      assert.equal(departamentoMasCercano(lat, lon), esperado, lugar);
    }
  });

  // No adivina países: fuera de Guatemala, el usuario elige de la lista.
  test("fuera de Guatemala no sugiere nada", () => {
    assert.equal(departamentoMasCercano(19.4326, -99.1332), null, "Ciudad de México");
    assert.equal(departamentoMasCercano(13.6929, -89.2182), null, "San Salvador");
    assert.equal(departamentoMasCercano(40.4168, -3.7038), null, "Madrid");
  });

  test("coordenadas rotas no sugieren nada", () => {
    assert.equal(departamentoMasCercano(Number.NaN, -90.5), null);
    assert.equal(departamentoMasCercano(14.6, Number.POSITIVE_INFINITY), null);
  });

  test("la distancia es razonable", () => {
    // Ciudad de Guatemala a Antigua: unos 25 km en línea recta.
    const d = distanciaKm(14.6349, -90.5069, 14.5586, -90.7339);
    assert.ok(d > 20 && d < 30, String(d));
  });
});
