// ===========================================================================
// La auditoría de las decisiones de moderación
//
// Estas pruebas existen por un fallo que estuvo dos fases sin verse. La decisión
// del moderador registraba en auditoría con SU sesión; la política solo le da
// SELECT a `authenticated`, y `registrar` no lanza nunca. Resultado: el motivo
// que la pantalla exige escribir se perdía siempre, sin un error.
//
// Los clientes falsos imitan lo que hace la base real: el del moderador puede
// cambiar el estado pero NO puede escribir la auditoría. Con el código anterior,
// la primera prueba falla.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decidirComoModerador, ErrorDeNoticia } from "../../../src/modules/noticias/index.ts";

type Insercion = { tabla: string; fila: Record<string, unknown> };

function clienteFalso(opciones: {
  /** Si puede escribir en auditoría. La sesión de un usuario NO puede. */
  escribeAuditoria: boolean;
  /** Si la política deja hacer el cambio de estado. */
  puedeModerar?: boolean;
  noticia?: { url_original: string | null; id_fuente: number | null };
}) {
  const inserciones: Insercion[] = [];
  const actualizaciones: Array<{ tabla: string; valores: Record<string, unknown> }> = [];

  const cliente = {
    from(tabla: string) {
      const consulta = {
        select: () => consulta,
        eq: () => consulta,
        maybeSingle: async () => ({ data: opciones.noticia ?? null, error: null }),
        update: (valores: Record<string, unknown>) => ({
          eq: async () => {
            if (opciones.puedeModerar === false) {
              return { error: { code: "42501", message: "new row violates row-level security policy" } };
            }
            actualizaciones.push({ tabla, valores });
            return { error: null };
          },
        }),
        insert: async (fila: Record<string, unknown>) => {
          if (tabla === "auditoria" && !opciones.escribeAuditoria) {
            return { error: { code: "42501", message: "permission denied for table auditoria" } };
          }
          inserciones.push({ tabla, fila });
          return { error: null };
        },
      };
      return consulta;
    },
  };

  return { cliente: cliente as unknown as SupabaseClient, inserciones, actualizaciones };
}

const MOTIVO = "La nota no cita ninguna fuente que se pueda comprobar.";

describe("la auditoría de la moderación", () => {
  test("el motivo queda registrado aunque la sesión del moderador no pueda escribir la bitácora", async () => {
    const moderador = clienteFalso({ escribeAuditoria: false, noticia: { url_original: null, id_fuente: 1 } });
    const sistema = clienteFalso({ escribeAuditoria: true });

    await decidirComoModerador(moderador.cliente, sistema.cliente, "n-1", "rechazar", "mod-1", MOTIVO);

    const evento = sistema.inserciones.find((i) => i.tabla === "auditoria")?.fila;
    assert.ok(evento, "la decisión no quedó en la auditoría");
    assert.equal(evento["accion"], "moderada_rechazar");
    assert.equal(evento["id_actor"], "mod-1");
    assert.equal(evento["id_entidad"], "n-1");
    assert.equal((evento["detalle"] as Record<string, unknown>)["motivo"], MOTIVO);
  });

  test("el cambio de estado sigue yendo con la sesión del moderador", async () => {
    const moderador = clienteFalso({ escribeAuditoria: false, noticia: { url_original: null, id_fuente: 1 } });
    const sistema = clienteFalso({ escribeAuditoria: true });

    await decidirComoModerador(moderador.cliente, sistema.cliente, "n-1", "archivar", "mod-1", MOTIVO);

    assert.equal(moderador.actualizaciones.length, 1);
    assert.equal(moderador.actualizaciones[0]?.valores["estado"], "archivada");
    assert.equal(sistema.actualizaciones.length, 0, "el sistema no debe cambiar el estado por su cuenta");
  });

  // Si la política rechaza el cambio, no se audita una decisión que no ocurrió.
  test("si la política rechaza el cambio, no queda nada auditado", async () => {
    const moderador = clienteFalso({ escribeAuditoria: false, puedeModerar: false });
    const sistema = clienteFalso({ escribeAuditoria: true });

    await assert.rejects(
      () => decidirComoModerador(moderador.cliente, sistema.cliente, "n-1", "aprobar", "lector-1", MOTIVO),
      (e: Error) => e instanceof ErrorDeNoticia && e.codigo === "sin_permiso",
    );
    assert.equal(sistema.inserciones.length, 0);
  });

  test("aprobar una nota de un dominio sin registrar deja el candidato en la auditoría", async () => {
    const moderador = clienteFalso({
      escribeAuditoria: false,
      noticia: { url_original: "https://www.medio-nuevo.gt/nota/123", id_fuente: null },
    });
    const sistema = clienteFalso({ escribeAuditoria: true });

    await decidirComoModerador(moderador.cliente, sistema.cliente, "n-2", "aprobar", "mod-1", MOTIVO);

    const acciones = sistema.inserciones.map((i) => i.fila["accion"]);
    assert.deepEqual(acciones, ["moderada_aprobar", "candidata_al_registro"]);
  });
});
