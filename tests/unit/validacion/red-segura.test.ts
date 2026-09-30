// ===========================================================================
// SSRF — que una URL enviada por un publicador no alcance la red interna
//
// La señal de URL verificable descarga lo que el publicador escriba. Estas
// pruebas son el control de que eso no se puede usar para que el servidor
// consulte cosas que no debe.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  crearTraerUrl,
  esDireccionPrivada,
  verificarDestinoPermitido,
  DestinoNoPermitido,
} from "../../../src/modules/validacion/index.ts";

describe("clasificacion de direcciones", () => {
  test("reconoce las que no deben alcanzarse", () => {
    const privadas = [
      "127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1",
      "169.254.169.254", // metadatos de nube: el objetivo clasico
      "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255",
      "::1", "::", "fc00::1", "fe80::1", "::ffff:127.0.0.1",
    ];
    for (const ip of privadas) {
      assert.equal(esDireccionPrivada(ip), true, `${ip} deberia estar bloqueada`);
    }
  });

  test("deja pasar las publicas", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "104.18.38.10", "172.15.0.1", "2606:4700::1"]) {
      assert.equal(esDireccionPrivada(ip), false, `${ip} deberia permitirse`);
    }
  });

  test("172.32 ya no es privada, 172.16 si", () => {
    assert.equal(esDireccionPrivada("172.32.0.1"), false);
    assert.equal(esDireccionPrivada("172.16.0.1"), true);
  });
});

const resuelveA = (ips: string[]) => async () => ips;

describe("verificacion del destino", () => {
  test("solo http y https", async () => {
    for (const url of ["file:///etc/passwd", "gopher://x/", "data:text/html,hola"]) {
      await assert.rejects(
        () => verificarDestinoPermitido(url, resuelveA(["8.8.8.8"])),
        DestinoNoPermitido,
      );
    }
  });

  test("rechaza los nombres internos por nombre", async () => {
    for (const url of [
      "http://localhost/admin",
      "http://algo.localhost/",
      "http://servidor.local/",
      "http://api.internal/",
      "http://metadata.google.internal/",
    ]) {
      await assert.rejects(() => verificarDestinoPermitido(url, resuelveA(["8.8.8.8"])), DestinoNoPermitido);
    }
  });

  test("rechaza una IP privada escrita directo", async () => {
    await assert.rejects(
      () => verificarDestinoPermitido("http://169.254.169.254/latest/meta-data/", resuelveA([])),
      DestinoNoPermitido,
    );
  });

  // El caso que hace que revisar solo el texto del host no sirva: el atacante
  // registra un dominio publico normal que resuelve a loopback.
  test("rechaza un nombre publico que resuelve a una direccion privada", async () => {
    await assert.rejects(
      () => verificarDestinoPermitido("https://parece-normal.com/nota", resuelveA(["127.0.0.1"])),
      DestinoNoPermitido,
    );
  });

  test("rechaza si CUALQUIERA de las direcciones es privada", async () => {
    await assert.rejects(
      () => verificarDestinoPermitido("https://mixto.com/", resuelveA(["8.8.8.8", "10.0.0.1"])),
      DestinoNoPermitido,
    );
  });

  test("acepta un destino publico normal", async () => {
    await verificarDestinoPermitido("https://prensalibre.com/nota", resuelveA(["104.18.38.10"]));
  });

  test("rechaza un nombre que no resuelve", async () => {
    await assert.rejects(
      () =>
        verificarDestinoPermitido("https://no-existe.invalid/", async () => {
          throw new Error("NXDOMAIN");
        }),
      DestinoNoPermitido,
    );
  });
});

describe("descarga", () => {
  const traerConFalsos = (
    paginas: Record<string, Response>,
    ips: Record<string, string[]> = {},
  ) =>
    crearTraerUrl({
      resolver: async (host) => ips[host] ?? ["104.18.38.10"],
      buscar: (async (entrada: string | URL) => {
        const url = entrada.toString();
        const respuesta = paginas[url];
        if (respuesta === undefined) return new Response("", { status: 404 });
        return respuesta.clone();
      }) as unknown as typeof fetch,
    });

  test("trae una pagina normal", async () => {
    const traer = traerConFalsos({
      "https://prensalibre.com/nota": new Response("<title>Hola</title>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    });
    const r = await traer("https://prensalibre.com/nota");
    assert.equal(r.estado, 200);
    assert.match(r.html, /Hola/);
  });

  test("devuelve el estado cuando el servidor responde mal", async () => {
    const traer = traerConFalsos({});
    const r = await traer("https://prensalibre.com/nota-borrada");
    assert.equal(r.estado, 404);
  });

  test("sigue una redireccion publica", async () => {
    const traer = traerConFalsos({
      "https://corto.com/x": new Response(null, {
        status: 301,
        headers: { location: "https://prensalibre.com/nota" },
      }),
      "https://prensalibre.com/nota": new Response("<title>Destino</title>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    });
    const r = await traer("https://corto.com/x");
    assert.equal(r.estado, 200);
    assert.match(r.html, /Destino/);
  });

  // El bypass clasico: el destino inicial es publico y respetable, y la
  // redireccion apunta adentro. Por eso los saltos se revisan uno por uno.
  test("corta una redireccion hacia la red interna", async () => {
    const traer = traerConFalsos(
      {
        "https://corto.com/x": new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data/" },
        }),
      },
      { "corto.com": ["104.18.38.10"] },
    );
    await assert.rejects(() => traer("https://corto.com/x"), DestinoNoPermitido);
  });

  test("no se queda en un ciclo de redirecciones", async () => {
    const traer = traerConFalsos({
      "https://ciclo.com/a": new Response(null, {
        status: 302,
        headers: { location: "https://ciclo.com/b" },
      }),
      "https://ciclo.com/b": new Response(null, {
        status: 302,
        headers: { location: "https://ciclo.com/a" },
      }),
    });
    await assert.rejects(() => traer("https://ciclo.com/a"), /redireccionamientos/);
  });

  test("un PDF no trae metadatos que comparar", async () => {
    const traer = traerConFalsos({
      "https://prensalibre.com/doc.pdf": new Response("%PDF-1.7 binario", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }),
    });
    const r = await traer("https://prensalibre.com/doc.pdf");
    assert.equal(r.estado, 200);
    assert.equal(r.html, "");
  });
});
