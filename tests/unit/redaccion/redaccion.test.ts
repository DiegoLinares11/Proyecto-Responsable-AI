// ===========================================================================
// La redacción: las mismas reglas por los dos caminos
//
// El portal manda un FormData y la app manda un JSON a /api/redaccion. Lo que
// se prueba es que los dos se leen igual y que lo que se rechaza se rechaza
// igual por los dos lados, antes de tocar la base. Lo que pasa después —que la
// sesión tenga el permiso— lo prueban las políticas de fila en la suite de RLS.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deFormData,
  deObjeto,
  moderarNoticia,
  publicarNoticia,
  resolverAlertaDeContenido,
  type Campo,
} from "../../../src/modules/redaccion/index.ts";
import type { PerfilDelVisitante } from "../../../src/lib/supabase-servidor.ts";

// Ninguno de estos casos debería llegar a la base: si alguno la toca, el
// cliente falso lo hace notar.
const clienteQueNoSeUsa = new Proxy(
  {},
  {
    get() {
      throw new Error("la validación tendría que haber cortado antes de usar el cliente");
    },
  },
) as SupabaseClient;

const perfil = { usuario: { id: "persona-1" } } as unknown as PerfilDelVisitante;

const valida = {
  titulo: "El Congreso aprueba el presupuesto del próximo año",
  resumen: "La votación terminó con 95 votos a favor y quedó lista para sanción.",
  cuerpo:
    "El pleno aprobó en tercera lectura el presupuesto general. La oposición votó en contra " +
    "y anunció que pedirá revisar dos partidas.",
  url: "https://ejemplo.gt/nota",
  seccion: "politica",
  alcance: "nacional",
  pais: "GT",
  origen_imagen: "ilustracion",
};

function comoFormulario(campos: Record<string, string>): FormData {
  const datos = new FormData();
  for (const [nombre, valor] of Object.entries(campos)) datos.set(nombre, valor);
  return datos;
}

/** Los dos caminos, con los mismos campos. */
function porLosDosCaminos(campos: Record<string, string>): [string, Campo][] {
  return [
    ["portal", deFormData(comoFormulario(campos))],
    ["app", deObjeto(campos)],
  ];
}

describe("leer los campos", () => {
  test("un FormData y un JSON con lo mismo se leen igual", () => {
    for (const nombre of Object.keys(valida)) {
      const k = nombre as keyof typeof valida;
      assert.equal(deFormData(comoFormulario(valida))(k), deObjeto(valida)(k));
    }
  });

  test("lo que falta se lee como texto vacío, por los dos lados", () => {
    assert.equal(deFormData(new FormData())("titulo"), "");
    assert.equal(deObjeto({})("titulo"), "");
  });

  test("del JSON solo pasan textos y números: un objeto o una lista no se cuelan", () => {
    const campo = deObjeto({ a: 7, b: { anidado: true }, c: ["x"], d: null, e: true });
    assert.equal(campo("a"), "7");
    assert.equal(campo("b"), "");
    assert.equal(campo("c"), "");
    assert.equal(campo("d"), "");
    assert.equal(campo("e"), "");
  });

  test("un cuerpo que no es un objeto no rompe nada", () => {
    for (const cuerpo of [null, undefined, "texto", 42, ["titulo"]]) {
      assert.equal(deObjeto(cuerpo)("titulo"), "");
    }
  });
});

describe("publicar: lo que se rechaza antes de llegar a la base", () => {
  const casos: [string, Record<string, string>, RegExp][] = [
    ["titular corto", { ...valida, titulo: "Corto" }, /titular/],
    ["resumen corto", { ...valida, resumen: "Muy breve" }, /resumen/],
    ["cuerpo corto", { ...valida, cuerpo: "No alcanza." }, /cuerpo/],
    ["enlace sin protocolo", { ...valida, url: "ejemplo.gt/nota" }, /http/],
    ["alcance inventado", { ...valida, alcance: "galactico" }, /Alcance/],
    ["local sin zona", { ...valida, alcance: "local", zona: "" }, /zona/],
    ["nacional sin país", { ...valida, pais: "" }, /país/],
    ["zona con otro formato", { ...valida, alcance: "local", zona: "guatemala" }, /Zona/],
    ["país con otro formato", { ...valida, pais: "Guatemala" }, /País/],
    ["imagen generada con IA", { ...valida, origen_imagen: "generada_ia" }, /no reconocido/],
    ["foto del medio por http", { ...valida, origen_imagen: "medio", url_imagen: "http://x.gt/f.jpg" }, /https/],
    [
      "foto del medio sin crédito",
      { ...valida, origen_imagen: "medio", url_imagen: "https://x.gt/f.jpg", texto_alterno_imagen: "Una sala llena" },
      /de quién es/,
    ],
    [
      "foto del medio sin texto alternativo",
      { ...valida, origen_imagen: "medio", url_imagen: "https://x.gt/f.jpg", credito_imagen: "Prensa Libre" },
      /texto alternativo/,
    ],
  ];

  for (const [nombre, campos, mensaje] of casos) {
    test(`${nombre}: mismo error por el portal y por la app`, async () => {
      const respuestas = [];
      for (const [, campo] of porLosDosCaminos(campos)) {
        const r = await publicarNoticia(clienteQueNoSeUsa, perfil, campo);
        assert.ok("error" in r, "tendría que rechazarse");
        assert.match(r.error, mensaje);
        respuestas.push(r.error);
      }
      assert.equal(respuestas[0], respuestas[1]);
    });
  }
});

describe("moderar: una decisión sin motivo no se audita, así que no se toma", () => {
  for (const [nombre, moderar] of [
    ["una noticia en revisión", moderarNoticia],
    ["una alerta de contenido", resolverAlertaDeContenido],
  ] as const) {
    test(`${nombre}: decisión inventada`, async () => {
      for (const [, campo] of porLosDosCaminos({ id: "n-1", decision: "borrar", motivo: "Un motivo largo" })) {
        const r = await moderar(clienteQueNoSeUsa, perfil, campo);
        assert.deepEqual(r, { error: "Decisión no reconocida." });
      }
    });

    test(`${nombre}: motivo de menos de 10 caracteres`, async () => {
      for (const [, campo] of porLosDosCaminos({ id: "n-1", decision: "archivar", motivo: "  porque  " })) {
        const r = await moderar(clienteQueNoSeUsa, perfil, campo);
        assert.ok("error" in r);
        assert.match(r.error, /motivo/);
      }
    });
  }

  test("aprobar no es una salida de una alerta: una alerta no publica nada", async () => {
    const r = await resolverAlertaDeContenido(
      clienteQueNoSeUsa,
      perfil,
      deObjeto({ id: "n-1", decision: "aprobar", motivo: "Me pareció bien" }),
    );
    assert.deepEqual(r, { error: "Decisión no reconocida." });
  });
});
