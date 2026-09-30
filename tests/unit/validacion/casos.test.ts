// ===========================================================================
// El canal completo — criterio de aceptación de la Fase 2
//
//   «Un conjunto de prueba de noticias (reales verificables, reales de fuente
//    dudosa, y fabricadas con URL inventada) se clasifica correctamente, y cada
//    decisión trae su desglose.»
//
// Las noticias son inventadas para la prueba, pero los dominios y los puntajes
// de credibilidad son los que siembra la migración, así que la aritmética es la
// real.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  evaluarVeracidad,
  filasDeValidacion,
  MAXIMOS,
  type NoticiaAValidar,
  type Veredicto,
} from "../../../src/modules/validacion/index.ts";

import {
  coberturaFalsa,
  cuerpoQueRespalda,
  deps,
  desmentidosFalsos,
  paginaCon,
  traerUrlFalso,
} from "./dobles.ts";

function noticia(cambios: Partial<NoticiaAValidar> = {}): NoticiaAValidar {
  const titulo = cambios.titulo ?? "Sismo de magnitud 5.4 sacude la costa sur de Guatemala";
  return {
    titulo,
    resumen: `${titulo}. No se reportaron danos mayores segun las autoridades.`,
    cuerpo: cuerpoQueRespalda(titulo),
    urlOriginal: "https://www.prensalibre.com/ciudades/sismo-costa-sur",
    publicadaEn: null,
    ...cambios,
  };
}

function senal(v: Veredicto, clave: string) {
  const hallada = v.senales.find((s) => s.senal === clave);
  assert.ok(hallada !== undefined, `falta la senal ${clave}`);
  return hallada;
}

const TRES_MEDIOS_SERIOS = [
  { url: "https://reuters.com/a", dominio: "reuters.com", titulo: "Sismo en Guatemala" },
  { url: "https://apnews.com/b", dominio: "apnews.com", titulo: "Sismo sacude Guatemala" },
  { url: "https://bbc.com/c", dominio: "bbc.com", titulo: "Terremoto en la costa de Guatemala" },
];

// ---------------------------------------------------------------------------

describe("noticias que se verifican solas", () => {
  test("fuente nacional, URL que coincide y tres medios serios corroborando", async () => {
    const n = noticia();
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS),
      }),
    );

    assert.equal(v.estado, "verificada");
    // 22.5 (Prensa Libre 75/100) + 20 (titular identico) + 30 (tope de
    // corroboracion) + 20 (coherencia) = 92.5
    assert.equal(v.puntaje, 93);
    assert.equal(senal(v, "credibilidad_fuente").detalle["resultado"], "dominio_registrado");
    assert.equal(senal(v, "corroboracion").detalle["resultado"], "corroborada");
  });
});

describe("noticias que van a revision humana", () => {
  test("medio digital de credibilidad media, sin corroboracion fuerte", async () => {
    const n = noticia({ urlOriginal: "https://soy502.com/articulo/sismo-costa-sur" });
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa([
          { url: "https://blog-x.com/1", dominio: "blog-x.com", titulo: "Sismo" },
        ]),
      }),
    );

    assert.equal(v.estado, "en_revision");
    assert.ok(v.puntaje >= 45 && v.puntaje < 75, `puntaje fuera de la banda: ${v.puntaje}`);
    assert.equal(senal(v, "corroboracion").detalle["resultado"], "corroboracion_debil");
  });

  test("dominio desconocido: no se rechaza, se escala", async () => {
    const n = noticia({ urlOriginal: "https://medio-local-nuevo.gt/nota/sismo" });
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS),
      }),
    );

    assert.notEqual(v.estado, "no_verificable");
    const s = senal(v, "credibilidad_fuente");
    assert.equal(s.detalle["resultado"], "dominio_desconocido");
    assert.match(String(s.detalle["explicacion"]), /No se rechaza/);
  });

  // Sin verificador de desmentidos, nada se publica solo: es la regla de
  // "nunca se da por buena una noticia por falta de datos".
  test("sin verificador de hechos configurado, el puntaje alto no alcanza", async () => {
    const n = noticia({ urlOriginal: "https://reuters.com/world/sismo-guatemala" });
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS),
        buscarDesmentidos: null,
        exigirVerificadorDeHechos: true,
      }),
    );

    assert.ok(v.puntaje >= 75, `el puntaje deberia ser alto, dio ${v.puntaje}`);
    assert.equal(v.estado, "en_revision");
    assert.match(v.motivo, /no se pudo comprobar/);
    assert.equal(senal(v, "desmentido").disponible, false);
  });

  test("relajar esa exigencia es una decision editorial, y queda registrada", async () => {
    const n = noticia({ urlOriginal: "https://reuters.com/world/sismo-guatemala" });
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS),
        buscarDesmentidos: null,
        exigirVerificadorDeHechos: false,
      }),
    );

    assert.equal(v.estado, "verificada");
    const s = senal(v, "desmentido");
    assert.equal(s.detalle["se_exige"], false);
    assert.match(String(s.detalle["explicacion"]), /decisi[oó]n editorial/);
  });

  test("si el buscador de cobertura se cae, la noticia no se da por corroborada", async () => {
    const n = noticia();
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(new Error("GDELT no responde")),
      }),
    );

    const s = senal(v, "corroboracion");
    assert.equal(s.disponible, false);
    assert.equal(s.aporte, 0);
    assert.notEqual(v.estado, "verificada");
  });

  test("si no se pudo descargar la URL, eso no cuenta contra la noticia pero tampoco a favor", async () => {
    const n = noticia();
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: new Error("ETIMEDOUT") }),
        buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS),
      }),
    );

    const s = senal(v, "url_verificable");
    assert.equal(s.disponible, false);
    assert.equal(s.detalle["resultado"], "no_se_pudo_consultar");
    assert.notEqual(v.estado, "verificada");
  });
});

describe("noticias fabricadas", () => {
  test("URL inventada que no existe", async () => {
    const n = noticia({
      titulo: "Gobierno anuncia bono extraordinario de 5000 quetzales para todos",
      urlOriginal: "https://noticias-guate-urgente.info/bono-5000",
    });
    const v = await evaluarVeracidad(n, deps()); // nada responde, sin cobertura

    assert.equal(v.estado, "no_verificable");
    assert.ok(v.puntaje < 45, `puntaje deberia ser bajo, dio ${v.puntaje}`);
    assert.equal(senal(v, "url_verificable").detalle["resultado"], "url_no_responde");
    assert.equal(senal(v, "url_verificable").disponible, true); // un 404 SI es informacion
    assert.match(v.motivo, /puede ver el desglose/);
  });

  test("la URL existe pero el titular dice otra cosa", async () => {
    const n = noticia({
      titulo: "El ministro de Finanzas renuncia tras el escandalo de sobornos",
      urlOriginal: "https://www.prensalibre.com/politica/ministro-finanzas",
    });
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({
          [n.urlOriginal!]: paginaCon("El ministro desmiente las acusaciones y seguira en el cargo"),
        }),
      }),
    );

    const s = senal(v, "url_verificable");
    assert.equal(s.detalle["resultado"], "titular_no_corresponde");
    assert.ok((s.detalle["similitud"] as number) < 0.35);
    assert.notEqual(v.estado, "verificada");
  });

  test("una afirmacion ya desmentida se veta, sin importar lo demas", async () => {
    const n = noticia({ urlOriginal: "https://reuters.com/world/sismo-guatemala" });
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS),
        buscarDesmentidos: desmentidosFalsos([
          {
            afirmacion: "Sismo de magnitud 5.4 en Guatemala",
            editor: "AFP Factual",
            calificacion: "Falso",
            url: "https://factual.afp.com/x",
          },
        ]),
      }),
    );

    assert.equal(v.estado, "desmentida");
    assert.equal(senal(v, "desmentido").veto, true);
    assert.match(v.motivo, /veto es anterior a cualquier puntaje/);
  });

  test("una calificacion afirmativa NO es un veto", async () => {
    const n = noticia({ urlOriginal: "https://reuters.com/world/sismo-guatemala" });
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS),
        buscarDesmentidos: desmentidosFalsos([
          {
            afirmacion: "Hubo un sismo en Guatemala",
            editor: "AFP Factual",
            calificacion: "Mayormente verdadero",
            url: "https://factual.afp.com/y",
          },
        ]),
      }),
    );

    assert.notEqual(v.estado, "desmentida");
    assert.equal(senal(v, "desmentido").veto, false);
  });

  test("restos de plantilla y titular gritado bajan la coherencia", async () => {
    const n = noticia({
      titulo: "URGENTE!!! GOBIERNO CONFIRMA BONO PARA TODOS",
      cuerpo: "[INSERTAR CUERPO AQUI] Lorem ipsum dolor sit amet.",
      urlOriginal: "https://sitio-raro.info/bono",
    });
    const v = await evaluarVeracidad(n, deps());

    const s = senal(v, "coherencia");
    assert.ok(s.aporte < MAXIMOS.coherencia, "deberia perder puntos de coherencia");
    const comprobaciones = s.detalle["comprobaciones"] as Array<{ nombre: string; paso: boolean }>;
    assert.equal(comprobaciones.find((c) => c.nombre === "sin_restos_de_plantilla")?.paso, false);
    assert.equal(comprobaciones.find((c) => c.nombre === "registro_sobrio")?.paso, false);
    assert.equal(v.estado, "no_verificable");
  });

  test("una fecha en el futuro no es plausible", async () => {
    const n = noticia({ publicadaEn: new Date("2027-01-01T00:00:00Z") });
    const v = await evaluarVeracidad(n, deps());

    const comprobaciones = senal(v, "coherencia").detalle["comprobaciones"] as Array<{
      nombre: string;
      paso: boolean;
    }>;
    assert.equal(comprobaciones.find((c) => c.nombre === "fecha_plausible")?.paso, false);
  });

  test("material de archivo presentado como noticia del dia", async () => {
    const n = noticia({ publicadaEn: new Date("2019-05-01T00:00:00Z") });
    const v = await evaluarVeracidad(n, deps());

    const comprobaciones = senal(v, "coherencia").detalle["comprobaciones"] as Array<{
      nombre: string;
      paso: boolean;
      detalle: string;
    }>;
    const fecha = comprobaciones.find((c) => c.nombre === "fecha_plausible");
    assert.equal(fecha?.paso, false);
    assert.match(String(fecha?.detalle), /archivo/);
  });
});

describe("reglas del conteo de corroboracion", () => {
  test("un medio no se corrobora a si mismo", async () => {
    const n = noticia(); // prensalibre.com
    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa([
          { url: "https://prensalibre.com/otra", dominio: "prensalibre.com", titulo: "Sismo" },
          { url: "https://noticias.prensalibre.com/mas", dominio: "noticias.prensalibre.com", titulo: "Sismo" },
        ]),
      }),
    );

    const s = senal(v, "corroboracion");
    assert.equal(s.detalle["resultado"], "sin_corroboracion");
    assert.equal(s.aporte, 0);
    assert.deepEqual(s.detalle["dominios_que_corroboran"], []);
  });

  test("veinte replicas de un cable cuentan como un medio", async () => {
    const n = noticia();
    const replicas = Array.from({ length: 20 }, (_, i) => ({
      url: `https://reuters.com/nota-${i}`,
      dominio: "reuters.com",
      titulo: "Sismo en Guatemala",
    }));

    const v = await evaluarVeracidad(
      n,
      deps({
        traerUrl: traerUrlFalso({ [n.urlOriginal!]: paginaCon(n.titulo) }),
        buscarCobertura: coberturaFalsa(replicas),
      }),
    );

    const s = senal(v, "corroboracion");
    assert.deepEqual(s.detalle["dominios_que_corroboran"], ["reuters.com"]);
    assert.equal(s.detalle["articulos_encontrados"], 20);
    assert.equal(s.aporte, 12); // 1 dominio (8) + es de buen nivel (4)
  });
});

describe("invariantes del canal", () => {
  test("una noticia sin URL nunca llega a verificada, ni con todo lo demas perfecto", async () => {
    const n = noticia({ urlOriginal: null });
    const v = await evaluarVeracidad(
      n,
      deps({ buscarCobertura: coberturaFalsa(TRES_MEDIOS_SERIOS) }),
    );

    // Credibilidad (30) y URL (20) quedan en cero por aritmetica, no por un if:
    // el tope alcanzable es 50 y el umbral es 75.
    assert.ok(v.puntaje <= 50, `el tope sin URL deberia ser 50, dio ${v.puntaje}`);
    assert.notEqual(v.estado, "verificada");
    assert.equal(senal(v, "credibilidad_fuente").detalle["resultado"], "sin_url");
  });

  test("todo veredicto trae las cinco senales con su desglose", async () => {
    const v = await evaluarVeracidad(noticia(), deps());

    assert.equal(v.senales.length, 5);
    assert.deepEqual(
      v.senales.map((s) => s.senal),
      ["credibilidad_fuente", "url_verificable", "corroboracion", "desmentido", "coherencia"],
    );

    for (const s of v.senales) {
      assert.ok(typeof s.detalle["explicacion"] === "string", `${s.senal} sin explicacion`);
      assert.ok(s.aporte >= 0 && s.aporte <= s.maximo, `${s.senal} fuera de rango`);
    }
    assert.ok(v.motivo.length > 20, "el motivo tiene que explicar la decision");
  });

  test("los maximos suman 100 y el puntaje nunca se sale del rango", async () => {
    const suma = Object.values(MAXIMOS).reduce((a, b) => a + b, 0);
    assert.equal(suma, 100);

    const v = await evaluarVeracidad(noticia(), deps());
    assert.ok(v.puntaje >= 0 && v.puntaje <= 100);
  });

  test("filasDeValidacion produce una fila por senal, lista para la base", async () => {
    const v = await evaluarVeracidad(noticia(), deps());
    const filas = filasDeValidacion("aaaaaaaa-0000-0000-0000-000000000001", v);

    assert.equal(filas.length, 5);
    for (const fila of filas) {
      assert.equal(fila.id_noticia, "aaaaaaaa-0000-0000-0000-000000000001");
      assert.ok(typeof fila.aporte === "number");
      assert.ok(typeof fila.disponible === "boolean");
      assert.ok("explicacion" in fila.detalle);
      assert.ok("maximo" in fila.detalle);
    }
    // Una fila por señal, sin repetir: la tabla tiene unique(id_noticia, senal).
    assert.equal(new Set(filas.map((f) => f.senal)).size, 5);
  });
});
